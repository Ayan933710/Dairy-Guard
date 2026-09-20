-- Rebrand from DairyGuard to NANDI

UPDATE users
SET full_name = 'NANDI Main Administrator'
WHERE email = 'harshkumar56367@gmail.com' AND role = 'administrator';
