import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  const BOT_TOKEN = import.meta.env.TELEGRAM_BOT_TOKEN;
  const GITHUB_TOKEN = import.meta.env.GITHUB_TOKEN;
  const REPO_OWNER = import.meta.env.REPO_OWNER;
  const REPO_NAME = import.meta.env.REPO_NAME;

  try {
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);

    if (body.message && body.message.document) {
      const fileId = body.message.document.file_id;
      const fileName = body.message.document.file_name;

      console.log(`Received file: ${fileName}`);

      // Get file from Telegram
      const fileResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
      const fileInfo = await fileResponse.json();

      if (!fileInfo.ok) {
        throw new Error(fileInfo.description);
      }

      // Download file content
      const filePath = fileInfo.result.file_path;
      const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
      const fileContent = await (await fetch(fileUrl)).text();

      // Load mutants.json from GitHub
      const mutantsRes = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/src/data/mutants/mutants.json`,
        { headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` } }
      );
      
      console.log(`Mutants API response: ${mutantsRes.status}`);
      
      if (!mutantsRes.ok) {
        const errorText = await mutantsRes.text();
        console.error(`GitHub API error: ${errorText}`);
        throw new Error(`Failed to load mutants.json: ${mutantsRes.status} - ${errorText}`);
      }
      
      const mutantsData = await mutantsRes.json();
      console.log(`Mutants data keys: ${Object.keys(mutantsData)}`);
      
      // For large files, GitHub returns empty content - use download_url instead
      let mutantsJson;
      if (mutantsData.content && mutantsData.content.length > 0) {
        console.log(`Using content from API response`);
        mutantsJson = atob(mutantsData.content);
      } else if (mutantsData.download_url) {
        console.log(`Using download_url for large file`);
        const downloadRes = await fetch(mutantsData.download_url);
        if (!downloadRes.ok) {
          throw new Error(`Failed to download mutants.json: ${downloadRes.status}`);
        }
        mutantsJson = await downloadRes.text();
        console.log(`Downloaded ${mutantsJson.length} bytes`);
        console.log(`First 100 chars: ${mutantsJson.slice(0, 100)}`);
        console.log(`Last 100 chars: ${mutantsJson.slice(-100)}`);
      } else {
        throw new Error('No content or download_url available for mutants.json');
      }
      
      console.log(`Mutants JSON length: ${mutantsJson.length}`);

      // Parse tiers
      const { parseTierData } = await import('../../lib/tier-parser');
      console.log(`Calling parseTierData with fileContent length: ${fileContent.length}, mutantsJson length: ${mutantsJson.length}`);
      const parsedTiers = parseTierData(fileContent, mutantsJson);

      // Validate
      const VALID_TIERS = ['1', '1+', '1-', '2', '2+', '2-', '3', '3+', '3-', '4'];
      for (const [mutantId, tier] of Object.entries(parsedTiers)) {
        if (!VALID_TIERS.includes(tier)) {
          return new Response(JSON.stringify({ error: `Invalid tier: ${tier}` }), { status: 400 });
        }
      }

      // Update via GitHub API
      if (GITHUB_TOKEN && REPO_OWNER && REPO_NAME) {
        // Get current file with sha
        const fileRes = await fetch(
          `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/src/data/mutants/mutants.json`,
          { headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` } }
        );

        const fileData = await fileRes.json();
        
        // For large files, download the content from download_url
        let currentMutants;
        if (fileData.content && fileData.content.length > 0) {
          currentMutants = JSON.parse(atob(fileData.content));
        } else if (fileData.download_url) {
          const downloadRes = await fetch(fileData.download_url);
          const text = await downloadRes.text();
          currentMutants = JSON.parse(text);
        } else {
          throw new Error('Cannot get mutants.json content');
        }

        let count = 0;
        for (const [mutantId, newTier] of Object.entries(parsedTiers)) {
          const idx = currentMutants.findIndex(m => m.id === mutantId);
          if (idx !== -1) {
            currentMutants[idx].tier = newTier;
            count++;
          }
        }

        // Update the file
        const updatedContent = JSON.stringify(currentMutants, null, 2);
        // Use TextEncoder for proper Unicode handling
        const encoded = Buffer.from(updatedContent, 'utf-8').toString('base64');
        
        const updateRes = await fetch(
          `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/src/data/mutants/mutants.json`,
          {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: `Update: ${count} tiers from Telegram`,
              content: encoded,
              sha: fileData.sha,
              branch: 'main'
            })
          }
        );

        if (!updateRes.ok) {
          const errorText = await updateRes.text();
          throw new Error(`Failed to update: ${updateRes.status} - ${errorText}`);
        }

        console.log(`Updated ${count} tiers`);
      }

      return new Response(JSON.stringify({ success: true, count: Object.keys(parsedTiers).length }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ message: 'OK' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};