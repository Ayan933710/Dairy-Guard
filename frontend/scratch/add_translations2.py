import re
import os

file_path = r"d:\CODING\HackCypher_Hackathon\SIH'26\NANDI\Dairy-Guard\frontend\src\hooks\useLanguage.jsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

en_add = """
    regionalAnalysis: 'Regional Analysis',
    selectFarmOwner: 'Select farm owner',
    animalName: 'Animal name',
    displayTag: 'Display tag',
    charRfid: '8-15 character RFID',
    remove: 'Remove',
    farmLabel: 'Farm',
    permanentAction: 'Permanent action',
    removeAnimalConfirm: 'Remove animal',
    removeAccountConfirm: 'Remove account',
    addAccountOrFarm: 'Add account or farm',
    refresh: 'Refresh',
    hubMonitoringByState: 'Hub monitoring by state',
    regionalRiskMap: 'Regional risk map',
    stateLabel: 'State',
    noStatesAvailable: 'No states available',
"""

hi_add = """
    regionalAnalysis: 'क्षेत्रीय विश्लेषण',
    selectFarmOwner: 'फार्म के मालिक का चयन करें',
    animalName: 'पशु का नाम',
    displayTag: 'डिस्प्ले टैग',
    charRfid: '8-15 अक्षर का RFID',
    remove: 'हटाएं',
    farmLabel: 'फार्म',
    permanentAction: 'स्थायी कार्रवाई',
    removeAnimalConfirm: 'पशु हटाएं',
    removeAccountConfirm: 'खाता हटाएं',
    addAccountOrFarm: 'खाता या फार्म जोड़ें',
    refresh: 'रिफ्रेश करें',
    hubMonitoringByState: 'राज्य द्वारा हब की निगरानी',
    regionalRiskMap: 'क्षेत्रीय जोखिम नक्शा',
    stateLabel: 'राज्य',
    noStatesAvailable: 'कोई राज्य उपलब्ध नहीं है',
"""

kn_add = """
    regionalAnalysis: 'ಪ್ರಾದೇಶಿಕ ವಿಶ್ಲೇಷಣೆ',
    selectFarmOwner: 'ಫಾರ್ಮ್ ಮಾಲೀಕರನ್ನು ಆಯ್ಕೆಮಾಡಿ',
    animalName: 'ಪ್ರಾಣಿಯ ಹೆಸರು',
    displayTag: 'ಡಿಸ್ಪ್ಲೇ ಟ್ಯಾಗ್',
    charRfid: '8-15 ಅಕ್ಷರಗಳ RFID',
    remove: 'ತೆಗೆದುಹಾಕಿ',
    farmLabel: 'ಫಾರ್ಮ್',
    permanentAction: 'ಶಾಶ್ವತ ಕ್ರಮ',
    removeAnimalConfirm: 'ಪ್ರಾಣಿಯನ್ನು ತೆಗೆದುಹಾಕಿ',
    removeAccountConfirm: 'ಖಾತೆಯನ್ನು ತೆಗೆದುಹಾಕಿ',
    addAccountOrFarm: 'ಖಾತೆ ಅಥವಾ ಫಾರ್ಮ್ ಸೇರಿಸಿ',
    refresh: 'ರಿಫ್ರೆಶ್ ಮಾಡಿ',
    hubMonitoringByState: 'ರಾಜ್ಯವಾರು ಹಬ್ ಮೇಲ್ವಿಚಾರಣೆ',
    regionalRiskMap: 'ಪ್ರಾದೇಶಿಕ ಅಪಾಯದ ನಕ್ಷೆ',
    stateLabel: 'ರಾಜ್ಯ',
    noStatesAvailable: 'ಯಾವುದೇ ರಾಜ್ಯಗಳು ಲಭ್ಯವಿಲ್ಲ',
"""

content = content.replace("vetRequests: 'Vet Requests',", "vetRequests: 'Vet Requests',\n" + en_add)
content = content.replace("vetConsole: 'पशु चिकित्सा अधिकारी कंसोल',", "vetConsole: 'पशु चिकित्सा अधिकारी कंसोल',\n" + hi_add)
content = content.replace("vetConsole: 'ಪಶುವೈದ್ಯಕೀಯ ಅಧಿಕಾರಿ ಕನ್ಸೋಲ್',", "vetConsole: 'ಪಶುವೈದ್ಯಕೀಯ ಅಧಿಕಾರಿ ಕನ್ಸೋಲ್',\n" + kn_add)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
