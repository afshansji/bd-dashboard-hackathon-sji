-- Sync UUIDs between auth.users and public.users tables
-- This will update the public.users table to use the same UUIDs as auth.users

-- First, let's see what we're working with
DO $$
DECLARE
    user_record RECORD;
BEGIN
    -- Update each user in public.users to match the auth.users UUID
    FOR user_record IN 
        SELECT au.id as auth_id, pu.id as public_id, pu.email, pu.first_name, pu.last_name, pu.role, pu.status, pu.password_hash, pu.refresh_token, pu.refresh_token_expires_at
        FROM auth.users au
        JOIN public.users pu ON au.email = pu.email::text
    LOOP
        -- If the UUIDs don't match, update the public.users record
        IF user_record.auth_id != user_record.public_id THEN
            -- Delete the old record and insert with the correct UUID
            DELETE FROM public.users WHERE id = user_record.public_id;
            
            INSERT INTO public.users (
                id, 
                email, 
                first_name, 
                last_name, 
                role, 
                status, 
                password_hash, 
                refresh_token, 
                refresh_token_expires_at,
                created_at,
                updated_at
            ) VALUES (
                user_record.auth_id,
                user_record.email,
                user_record.first_name,
                user_record.last_name,
                user_record.role,
                user_record.status,
                user_record.password_hash,
                user_record.refresh_token,
                user_record.refresh_token_expires_at,
                NOW(),
                NOW()
            );
            
            RAISE NOTICE 'Updated user % from UUID % to %', user_record.email, user_record.public_id, user_record.auth_id;
        END IF;
    END LOOP;
END
$$;