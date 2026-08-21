




ALTER TABLE businesses
ADD COLUMN user_id INTEGER;

ALTER TABLE businesses
ADD CONSTRAINT fk_business_user
FOREIGN KEY (user_id)
REFERENCES users(id)
ON DELETE CASCADE;

