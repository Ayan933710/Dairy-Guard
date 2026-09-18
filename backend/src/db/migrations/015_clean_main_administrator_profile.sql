UPDATE users
SET phone = NULL,
    farm_name = NULL,
    farm_id = NULL,
    farm_state = NULL,
    farm_district = NULL,
    hub_latitude = NULL,
    hub_longitude = NULL,
    updated_at = now()
WHERE email = 'harshkumar56367@gmail.com'
  AND role = 'administrator';
