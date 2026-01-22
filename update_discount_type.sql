-- Update discount type enum to include fixed_amount
ALTER TABLE discounts 
MODIFY discount_type ENUM('percentage', 'fixed', 'fixed_amount') NOT NULL; 