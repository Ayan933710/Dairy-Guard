"""
Subclinical Mastitis On-Spot Predictor -- Quarter-Level
=========================================================

Mastitis is typically unilateral (affects one teat/quarter), and composite
(all-4-mixed) milk sampling dilutes the elevated pH/EC/viscosity signal from
an infected quarter with normal milk from the other three -- this is a
documented, known weakness of composite sampling in the mastitis-detection
literature. This version fixes that by:

  1. Operating at the QUARTER level (one row per teat per milking event,
     not one row per animal).
  2. Computing INTER-QUARTER DIFFERENTIAL (IQD) features: each quarter's
     pH/EC/viscosity relative to the lowest-value quarter of the SAME
     animal at the SAME milking (the standard assumption -- also used in
     commercial systems like the AHI Mastitis Detector / REM test -- is
     that the lowest-value quarter is that animal's own healthy baseline
     at that moment). This cancels out animal-level and session-level
     noise (feed, time of day, individual physiology) that contaminates a
     fixed population threshold.

Pipeline:
  1. train_model()      -> trains + calibrates a model (RandomForest or
                            XGBoost, pick via model_type=) on your labeled
                            quarter-level dataset, saves it to disk
  2. predict_on_spot()   -> takes ALL FOUR quarter readings from one
                            milking event, computes IQD features, and
                            returns a prediction + confidence PER QUARTER

Model choice: pass model_type="random_forest" (default) or
model_type="xgboost" to train_model(). Both go through the same
preprocessing, IQD features, and probability calibration -- only the base
classifier differs. XGBoost requires `pip install xgboost` separately; it
isn't a default scikit-learn dependency.
  - RandomForest: fewer knobs to tune, very robust on small/noisy field
    datasets, good default when you're just starting to collect data.
  - XGBoost: usually edges out RandomForest once you have a few thousand+
    labeled rows and want to squeeze out extra accuracy; more sensitive to
    hyperparameters, so revisit tuning (n_estimators, max_depth,
    learning_rate) once your real dataset size is known.

Expected input: readings for all 4 quarters of one animal, one milking event.
Per-quarter fields:
  quarter       : "LF" | "RF" | "LH" | "RH"
  ph            : milk pH (float)
  ec            : milk electrical conductivity, mS/cm (float)
  motor_ma      : motor current draw proxy for viscosity, mA (float)
  color         : "normal" | "flaky" | "blood_tinged" | "yellow" | "watery"
Shared across all 4 quarters of the same reading event (not per-teat):
  shed_thi      : shed/barn Temperature-Humidity Index (environmental
                   heat-stress context, NOT a per-teat measurement)

rumination_min is DELIBERATELY NOT a feature here -- per your instruction,
it stays a dashboard-only metric on your side and never touches the model.

Label expected in training data: "mastitis" (0 = healthy, 1 = subclinical)
  -> per QUARTER, from a real reference standard (quarter-level SCC and/or
     quarter-level CMT). Composite-milk SCC/CMT is not granular enough to
     label individual quarters correctly -- you need quarter-level ground
     truth for this to work as intended.

NOTE: No within-animal LONGITUDINAL baseline (day-over-day drift) is applied
yet -- that's a separate, later addition per earlier discussion. What's
implemented here is the WITHIN-MILKING, ACROSS-QUARTER comparison, which is
a different (and, per the literature, a more fundamental) normalization.
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import (
    classification_report, roc_auc_score, confusion_matrix
)

try:
    from xgboost import XGBClassifier
    _XGBOOST_AVAILABLE = True
except ImportError:
    _XGBOOST_AVAILABLE = False
import joblib

QUARTERS = ["LF", "RF", "LH", "RH"]  # left-front, right-front, left-hind, right-hind

RAW_NUMERIC = ["ph", "ec", "motor_ma"]
IQD_NUMERIC = ["ph_iqd", "ec_iqd", "motor_ma_iqd"]
SHARED_NUMERIC = ["shed_thi"]
NUMERIC_FEATURES = RAW_NUMERIC + IQD_NUMERIC + SHARED_NUMERIC
CATEGORICAL_FEATURES = ["color", "quarter"]
ALL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES

LABEL_COL = "mastitis"
MODEL_PATH = "mastitis_model_quarter.joblib"


def compute_iqd_features(df: pd.DataFrame, session_col: str = "session_id") -> pd.DataFrame:
    """
    Adds ph_iqd / ec_iqd / motor_ma_iqd to a LONG-format dataframe where
    each session_id has exactly 4 rows (one per quarter).

    IQD = this quarter's value - MIN value among the other 3 quarters in
    the same session. The minimum-value quarter is treated as that
    animal's own healthy reference for that milking (standard assumption
    in quarter-differential mastitis detection).
    """
    df = df.copy()
    for raw_col in RAW_NUMERIC:
        df[f"{raw_col}_iqd"] = np.nan  # placeholder, filled below

    for session_id, group in df.groupby(session_col):
        idx = group.index
        for raw_col, iqd_col in zip(RAW_NUMERIC, IQD_NUMERIC):
            vals = group[raw_col].to_numpy()
            iqd_vals = np.zeros(len(vals))
            for i in range(len(vals)):
                others = np.delete(vals, i)
                iqd_vals[i] = vals[i] - others.min()
            df.loc[idx, iqd_col] = iqd_vals
    return df


def build_feature_pipeline() -> ColumnTransformer:
    return ColumnTransformer(
        transformers=[
            ("num", "passthrough", NUMERIC_FEATURES),
            ("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL_FEATURES),
        ]
    )


def _build_base_classifier(model_type: str, random_state: int):
    """
    Returns an unfitted base classifier for the given model_type.
    "random_forest" -> sklearn RandomForestClassifier
    "xgboost"        -> xgboost XGBClassifier (requires `pip install xgboost`)
    """
    if model_type == "random_forest":
        return RandomForestClassifier(
            n_estimators=400,
            max_depth=None,
            min_samples_leaf=3,
            class_weight="balanced",
            random_state=random_state,
            n_jobs=-1,
        )
    elif model_type == "xgboost":
        if not _XGBOOST_AVAILABLE:
            raise ImportError(
                "xgboost is not installed. Run `pip install xgboost` "
                "(or `pip install xgboost --break-system-packages` in this "
                "container) and try again."
            )
        return XGBClassifier(
            n_estimators=400,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            # subclinical mastitis is low-prevalence -- scale_pos_weight is
            # XGBoost's equivalent of RandomForest's class_weight="balanced".
            # Set dynamically in train_model() once we know the class ratio.
            eval_metric="logloss",
            random_state=random_state,
            n_jobs=-1,
        )
    else:
        raise ValueError(f"Unknown model_type '{model_type}'. Use 'random_forest' or 'xgboost'.")


def train_model(
    csv_path: str,
    group_col: str = "animal_id",
    session_col: str = "session_id",
    model_out: str = None,
    model_type: str = "random_forest",
    random_state: int = 42,
) -> Pipeline:
    """
    Trains a calibrated classifier (RandomForest or XGBoost) on a
    LONG-format, quarter-level labeled dataset (4 rows per milking session).

    model_type: "random_forest" (default) or "xgboost"
    model_out: where to save the trained pipeline. Defaults to
        "mastitis_model_quarter_<model_type>.joblib" if not given, so
        RandomForest and XGBoost runs don't overwrite each other.

    Required columns: session_id, animal_id, quarter, ph, ec, motor_ma,
    color, shed_thi, mastitis.

    IQD features are computed here automatically from the raw quarter
    values -- you don't need to precompute them in your CSV.
    """
    if model_out is None:
        model_out = f"mastitis_model_quarter_{model_type}.joblib"
    df = pd.read_csv(csv_path)

    required_raw = {"session_id", "animal_id", "quarter", "ph", "ec",
                     "motor_ma", "color", "shed_thi", LABEL_COL}
    missing = required_raw - set(df.columns)
    if missing:
        raise ValueError(f"Dataset missing required columns: {missing}")

    df = compute_iqd_features(df, session_col=session_col)

    # Split by animal_id so the same cow's quarters never leak across
    # train/test.
    splitter = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=random_state)
    train_idx, test_idx = next(splitter.split(df, groups=df[group_col]))
    train_df, test_df = df.iloc[train_idx], df.iloc[test_idx]

    X_train, y_train = train_df[ALL_FEATURES], train_df[LABEL_COL]
    X_test, y_test = test_df[ALL_FEATURES], test_df[LABEL_COL]

    preprocessor = build_feature_pipeline()

    base_clf = _build_base_classifier(model_type, random_state)

    if model_type == "xgboost":
        # XGBoost has no class_weight="balanced" option -- the equivalent
        # is scale_pos_weight = (# negative / # positive) in the TRAINING
        # split specifically, computed here since it depends on the data.
        n_pos = (y_train == 1).sum()
        n_neg = (y_train == 0).sum()
        base_clf.set_params(scale_pos_weight=n_neg / max(n_pos, 1))

    calibrated_clf = CalibratedClassifierCV(base_clf, method="isotonic", cv=5)

    pipeline = Pipeline(steps=[
        ("preprocess", preprocessor),
        ("classify", calibrated_clf),
    ])
    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    y_proba = pipeline.predict_proba(X_test)[:, 1]

    print(f"=== Validation Report (per-quarter, model_type='{model_type}') ===")
    print(classification_report(y_test, y_pred, target_names=["healthy", "subclinical"]))
    print(f"AUC: {roc_auc_score(y_test, y_proba):.3f}")
    print("Confusion matrix (rows=true, cols=pred):")
    print(confusion_matrix(y_test, y_pred))

    joblib.dump(pipeline, model_out)
    print(f"\nModel saved to {model_out}")
    return pipeline


def predict_on_spot(quarter_readings: list, shed_thi: float, model_path: str = MODEL_PATH) -> dict:
    """
    Scores ALL FOUR quarters of ONE milking event at once (IQD needs all 4
    to compute the reference quarter).

    quarter_readings: list of 4 dicts, one per quarter, e.g.
        [
            {"quarter": "LF", "ph": 6.6, "ec": 4.8, "motor_ma": 21, "color": "normal"},
            {"quarter": "RF", "ph": 6.9, "ec": 5.9, "motor_ma": 29, "color": "flaky"},
            {"quarter": "LH", "ph": 6.5, "ec": 4.7, "motor_ma": 20, "color": "normal"},
            {"quarter": "RH", "ph": 6.6, "ec": 4.9, "motor_ma": 21, "color": "normal"},
        ]
    shed_thi: single environmental THI value shared across all 4 quarters

    Returns a dict keyed by quarter, each with prediction + confidence, e.g.
        {
            "LF": {"prediction": "healthy", "confidence": 0.94, ...},
            "RF": {"prediction": "subclinical", "confidence": 0.88, ...},
            ...
        }
    """
    if len(quarter_readings) != 4:
        raise ValueError("Must provide readings for all 4 quarters at once (IQD needs all 4).")

    present_quarters = {r["quarter"] for r in quarter_readings}
    if present_quarters != set(QUARTERS):
        raise ValueError(f"Expected quarters {QUARTERS}, got {sorted(present_quarters)}")

    session_df = pd.DataFrame(quarter_readings)
    session_df["session_id"] = "on_spot_session"
    session_df["shed_thi"] = shed_thi

    session_df = compute_iqd_features(session_df, session_col="session_id")

    pipeline: Pipeline = joblib.load(model_path)
    X = session_df[ALL_FEATURES]
    proba = pipeline.predict_proba(X)  # columns: [P(healthy), P(subclinical)]

    results = {}
    for i, row in session_df.iterrows():
        p = proba[session_df.index.get_loc(i)]
        pred_idx = int(np.argmax(p))
        results[row["quarter"]] = {
            "prediction": "subclinical" if pred_idx == 1 else "healthy",
            "confidence": round(float(p[pred_idx]), 4),
            "subclinical_probability": round(float(p[1]), 4),
        }
    return results


# ---------------------------------------------------------------------------
# Demo / self-test using SYNTHETIC data -- NOT real data. Exists only to
# prove the pipeline runs end-to-end. Replace with real quarter-level
# SCC/CMT-labeled data before drawing any conclusions.
#
# Simulates the real-world scenario directly: for "mastitis" sessions, ONE
# randomly chosen quarter gets elevated pH/EC/viscosity while the other 3
# stay at healthy baseline -- this is what makes IQD features valuable and
# demonstrates why a composite/averaged reading would dilute and miss it.
# pH/EC ranges taken from your provided threshold tables (species-combined,
# since species isn't a feature yet). motor_ma baseline (~21 mA healthy) is
# taken from your actual hardware's observed readings on normal samples --
# the mastitis-elevated increase on top of that is still a guess (no real
# reference point for that yet), so treat that specific delta as rough.
# ---------------------------------------------------------------------------
def _generate_synthetic_demo_data(n_sessions=300, random_state=42) -> pd.DataFrame:
    rng = np.random.default_rng(random_state)
    rows = []
    animal_ids = rng.integers(1000, 1150, n_sessions)

    for session_i in range(n_sessions):
        animal_id = animal_ids[session_i]
        session_id = f"s{session_i}"
        shed_thi = rng.uniform(60, 85)  # one shed_thi shared by all 4 quarters this session
        has_mastitis = rng.random() < 0.20  # ~20% of sessions have one affected quarter
        infected_quarter = rng.choice(QUARTERS) if has_mastitis else None

        for q in QUARTERS:
            is_infected = (q == infected_quarter)
            ph = rng.uniform(6.5, 6.9) if is_infected else rng.uniform(6.1, 6.8)
            ec = rng.uniform(4.9, 6.3) if is_infected else rng.uniform(4.0, 5.5)
            motor_ma = (rng.normal(21, 1.5) + rng.uniform(4, 9)) if is_infected else rng.normal(21, 1.5)
            color = (
                rng.choice(["flaky", "blood_tinged", "watery", "normal"], p=[0.4, 0.15, 0.15, 0.3])
                if is_infected else
                rng.choice(["normal", "watery"], p=[0.9, 0.1])
            )
            rows.append({
                "session_id": session_id,
                "animal_id": animal_id,
                "quarter": q,
                "ph": ph,
                "ec": ec,
                "motor_ma": motor_ma,
                "color": color,
                "shed_thi": shed_thi,
                "mastitis": int(is_infected),
            })

    return pd.DataFrame(rows)


if __name__ == "__main__":
    import os

    demo_csv = "synthetic_mastitis_quarter_demo.csv"
    if not os.path.exists(demo_csv):
        _generate_synthetic_demo_data().to_csv(demo_csv, index=False)
        print(f"Generated synthetic demo dataset: {demo_csv}\n"
              f"(NOT real data -- replace with real quarter-level SCC/CMT-\n"
              f"labeled data before drawing any conclusions.)\n")

    example_session = [
        {"quarter": "LF", "ph": 6.6, "ec": 4.8, "motor_ma": 21, "color": "normal"},
        {"quarter": "RF", "ph": 6.85, "ec": 5.9, "motor_ma": 29, "color": "flaky"},
        {"quarter": "LH", "ph": 6.55, "ec": 4.7, "motor_ma": 20, "color": "normal"},
        {"quarter": "RH", "ph": 6.6, "ec": 4.9, "motor_ma": 21, "color": "normal"},
    ]

    # --- RandomForest run (always available) ---
    rf_model_path = train_model(demo_csv, model_type="random_forest").steps  # trains + saves
    rf_model_path = "mastitis_model_quarter_random_forest.joblib"
    print("\n=== RandomForest: example on-spot prediction ===")
    for q, r in predict_on_spot(example_session, shed_thi=72.0, model_path=rf_model_path).items():
        print(q, "->", r)

    # --- XGBoost run (only if installed) ---
    if _XGBOOST_AVAILABLE:
        xgb_model_path = "mastitis_model_quarter_xgboost.joblib"
        train_model(demo_csv, model_type="xgboost")
        print("\n=== XGBoost: example on-spot prediction ===")
        for q, r in predict_on_spot(example_session, shed_thi=72.0, model_path=xgb_model_path).items():
            print(q, "->", r)
    else:
        print("\n[xgboost not installed in this environment -- skipping XGBoost run.\n"
              " Run `pip install xgboost` and re-run this script to compare both models.]")
