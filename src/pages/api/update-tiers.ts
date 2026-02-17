import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Path to pending tier updates file
const PENDING_UPDATES_FILE = join(process.cwd(), 'temp', 'pending_tier_updates.json');

// Valid tier values
const VALID_TIERS = ['1+', '1-', '2+', '2', '2-', '3+', '3', '3-', '4'];

// Simple token-based authentication
const AUTH_TOKEN = process.env.API_UPDATE_TOKEN || 'your-secret-token-here';

export async function POST({ request }) {
  const authHeader = request.headers.get('authorization');
  
  // Check authentication
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Missing or invalid authorization token' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  const token = authHeader.substring(7);
  if (token !== AUTH_TOKEN) {
    return new Response(
      JSON.stringify({ error: 'Invalid authorization token' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  try {
    // Parse request body
    const body = await request.json();
    const { tiers, source } = body;
    
    if (!tiers || typeof tiers !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Invalid request: tiers object required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate all tier values before processing
    for (const [mutantId, tier] of Object.entries(tiers)) {
      if (typeof tier !== 'string' || !VALID_TIERS.includes(tier)) {
        return new Response(
          JSON.stringify({ error: `Invalid tier value "${tier}" for mutant ${mutantId}. Valid values are: ${VALID_TIERS.join(', ')}` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Create/update pending updates file
    const updateData = {
      timestamp: Date.now(),
      source: source || 'unknown',
      tiers
    };
    
    writeFileSync(PENDING_UPDATES_FILE, JSON.stringify(updateData, null, 2));
    
    // Count updates
    const updatedCount = Object.keys(tiers).length;
    
    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: `Received ${updatedCount} tier updates. GitHub Action will process them shortly.`,
        updatedCount,
        source: source || 'unknown',
        note: "Changes will be applied to mutants.json via GitHub Action"
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error processing tier updates:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Support GET for testing/debugging
export async function GET() {
  return new Response(
    JSON.stringify({ 
      message: 'Tier update API endpoint',
      method: 'POST',
      auth: 'Bearer token required',
      note: "Stores updates in pending file for GitHub Action processing"
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
