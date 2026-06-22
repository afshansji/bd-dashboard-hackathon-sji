-- Update existing deals to map Control Tower stages to local pipeline stages
UPDATE deals 
SET stage = 'prospecting' 
WHERE stage IN ('960993642', '960993646', '960993650', '123153694', '960399524', 'appointmentscheduled');

UPDATE deals 
SET stage = 'qualification' 
WHERE stage IN ('960993643', '960993647', '960993651', 'qualifiedtobuy');

UPDATE deals 
SET stage = 'proposal' 
WHERE stage IN ('960993644', '960993648', 'presentationscheduled', 'decisionmakerboughtin');

UPDATE deals 
SET stage = 'negotiation' 
WHERE stage IN ('960993645', '960993649', 'contractsent');

UPDATE deals 
SET stage = 'closed_won' 
WHERE stage = 'closedwon';

UPDATE deals 
SET stage = 'closed_lost' 
WHERE stage = 'closedlost';