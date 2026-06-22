-- Enable realtime for contact_sequence_enrollments
ALTER TABLE contact_sequence_enrollments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE contact_sequence_enrollments;

-- Enable realtime for sequence_execution_log
ALTER TABLE sequence_execution_log REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE sequence_execution_log;