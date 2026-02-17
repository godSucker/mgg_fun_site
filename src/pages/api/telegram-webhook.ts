import { parseTierData } from '../../lib/tier-parser';

// Valid tier values
const VALID_TIERS = ['1+', '1-', '2+', '2', '2-', '3+', '3', '3-', '4'];

// Telegram bot token
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_TOKEN = process.env.API_UPDATE_TOKEN;

export async function POST({ request }) {
  try {
    // Verify this is coming from Telegram
    const token = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (token !== API_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    
    // Handle different types of updates
    if (body.message) {
      if (body.message.document) {
        // Process document (file) upload
        const fileId = body.message.document.file_id;
        const fileName = body.message.document.file_name;
        
        console.log(`Received file: ${fileName} with ID: ${fileId}`);
        
        try {
          // Get file info from Telegram
          const fileResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
          const fileInfo = await fileResponse.json();
          
          if (!fileInfo.ok) {
            throw new Error(`Could not get file info: ${fileInfo.description}`);
          }
          
          // Download the file content
          const filePath = fileInfo.result.file_path;
          const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
          
          const fileContentResponse = await fetch(fileUrl);
          const fileContent = await fileContentResponse.text();
          
          // Parse the tier data from the file content
          const parsedTiers = await parseTierData(fileContent);
          
          // Validate tier values
          for (const [mutantId, tier] of Object.entries(parsedTiers)) {
            if (!VALID_TIERS.includes(tier)) {
              return new Response(
                JSON.stringify({ error: `Invalid tier value "${tier}" for mutant ${mutantId}` }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
              );
            }
          }
          
          // Store the updates in a temporary storage (for demo purposes, we'll use a simple approach)
          // In a real implementation, you would use a database or other persistent storage
          
          // For now, we'll trigger the GitHub Action via the GitHub API
          // This requires a GitHub token with appropriate permissions
          const githubToken = process.env.GITHUB_TOKEN;
          const owner = process.env.REPO_OWNER; // e.g., 'your-username'
          const repo = process.env.REPO_NAME; // e.g., 'your-repo-name'
          
          if (githubToken && owner && repo) {
            try {
              // Trigger the workflow using GitHub API
              const workflowDispatchResponse = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/actions/workflows/process-tier-updates.yml/dispatches`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    ref: 'main', // or whatever your default branch is
                    inputs: {
                      // Pass the tier updates as inputs if needed
                      // This depends on how you want to handle the data in the workflow
                    }
                  })
                }
              );
              
              if (!workflowDispatchResponse.ok) {
                console.error('Failed to trigger GitHub Action:', await workflowDispatchResponse.text());
              }
            } catch (workflowError) {
              console.error('Error triggering GitHub Action:', workflowError);
            }
          }
          
          // Respond to Telegram
          return new Response(
            JSON.stringify({
              success: true,
              message: `Received ${Object.keys(parsedTiers).length} tier updates. GitHub Action will process them shortly.`
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        } catch (downloadError) {
          console.error('Error downloading or processing file:', downloadError);
          return new Response(
            JSON.stringify({ error: 'Could not download or process the file', details: downloadError.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }
      } else if (body.message.text) {
        // Handle text commands
        const text = body.message.text;
        
        let responseText = '';
        
        if (text === '/start') {
          responseText = 'Welcome! Send me a file with tier data to update mutants.';
        } else if (text === '/help') {
          responseText = 'Send me a .txt file with tier data in the format: "Russian_Name,Tier"';
        } else {
          responseText = 'Send me a file with tier data to update mutants.';
        }
        
        return new Response(
          JSON.stringify({ message: responseText }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    
    return new Response(
      JSON.stringify({ message: 'Update received' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing Telegram update:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// For setting up webhook
export async function GET({ url }) {
  const params = new URLSearchParams(url.search);
  const action = params.get('action');
  
  if (action === 'setWebhook') {
    if (!BOT_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'BOT_TOKEN not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const webhookUrl = `${url.origin}/api/telegram-webhook`;
    const telegramApiUrl = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`;
    
    try {
      const response = await fetch(telegramApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: webhookUrl,
          secret_token: API_TOKEN
        })
      });
      
      const result = await response.json();
      
      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
  
  return new Response(
    JSON.stringify({ 
      message: 'Telegram webhook endpoint',
      setup: 'Send GET request with ?action=setWebhook to configure webhook'
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}