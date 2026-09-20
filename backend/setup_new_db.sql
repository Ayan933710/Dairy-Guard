-- Run this script as the 'postgres' superuser (or using pgAdmin) 
-- to create the new NANDI database and user.

CREATE USER nandi_user WITH PASSWORD 'nandi_pass';
CREATE DATABASE nandi_db;
GRANT ALL PRIVILEGES ON DATABASE nandi_db TO nandi_user;
