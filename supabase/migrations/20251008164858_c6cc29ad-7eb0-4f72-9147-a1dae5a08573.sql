-- Add foreign key constraint between projects and clients
ALTER TABLE projects 
ADD CONSTRAINT projects_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES clients(id) 
ON DELETE CASCADE;