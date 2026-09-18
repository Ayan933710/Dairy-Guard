const asyncHandler = require('../utils/asyncHandler');
const userModel = require('../models/userModel');
const vetRequestModel = require('../models/vetRequestModel');

const createRequest = asyncHandler(async (req, res) => {
  const requestedDistrict = req.body.requested_district?.trim();
  if (req.user.role !== 'vet') return res.status(403).json({ error: 'Only vet accounts can submit district requests.' });
  if (req.user.vet_approval_status === 'approved') return res.status(409).json({ error: 'This vet account is already approved.' });
  if (!requestedDistrict) return res.status(400).json({ error: 'requested_district is required.' });
  if (requestedDistrict.length > 120) return res.status(400).json({ error: 'requested_district is too long.' });

  const existing = await vetRequestModel.findPendingByVet(req.user.id);
  if (existing) return res.status(409).json({ error: 'You already have a pending district request.', request: existing });

  const request = await vetRequestModel.create(req.user.id, requestedDistrict);
  res.status(201).json({ request });
});

const listPendingRequests = asyncHandler(async (req, res) => {
  res.json({ requests: await vetRequestModel.listPending() });
});

const approveRequest = asyncHandler(async (req, res) => {
  const request = await vetRequestModel.approve(req.params.requestId, req.user.id);
  if (!request) return res.status(404).json({ error: 'Pending vet request not found.' });
  const user = await userModel.updateVetDistrict(request.vet_id, request.requested_district);
  if (!user) return res.status(404).json({ error: 'Vet account no longer exists.' });
  res.json({ request, user });
});

const rejectRequest = asyncHandler(async (req, res) => {
  const request = await vetRequestModel.reject(req.params.requestId, req.user.id);
  if (!request) return res.status(404).json({ error: 'Pending vet request not found.' });
  res.json({ request });
});

module.exports = { createRequest, listPendingRequests, approveRequest, rejectRequest };