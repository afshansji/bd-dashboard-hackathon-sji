/**
 * Shared helper for retrieving Control Tower credentials from environment variables
 */
export const getControlTowerCredentials = () => {
  const url = Deno.env.get('Controltowerurl');
  const key = Deno.env.get('CONTROLTOWERAPIKEY');
  
  if (!url || !key) {
    throw new Error('Control Tower credentials not configured in environment variables');
  }
  
  return { url, key };
};
