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

      // Parse tiers
      const { parseTierData } = await import('../../lib/tier-parser');
      const parsedTiers = await parseTierData(fileContent);

      // Validate
      const VALID_TIERS = ['1+', '1-', '2+', '2', '2-', '3+', '3', '3-', '4'];
      for (const [mutantId, tier] of Object.entries(parsedTiers)) {
        if (!VALID_TIERS.includes(tier)) {
          return new Response(JSON.stringify({ error: `Invalid tier: ${tier}` }), { status: 400 });
        }
      }

      // Update via GitHub API
      if (GITHUB_TOKEN && REPO_OWNER && REPO_NAME) {
        const fileRes = await fetch(
          `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/src/data/mutants/mutants.json`,
          { headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` } }
        );

        const fileData = await fileRes.json();
        const currentMutants = JSON.parse(atob(fileData.content));

        let count = 0;
        for (const [mutantId, newTier] of Object.entries(parsedTiers)) {
          const idx = currentMutants.findIndex(m => m.id === mutantId);
          if (idx !== -1) {
            currentMutants[idx].tier = newTier;
            count++;
          }
        }

        await fetch(
          `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/src/data/mutants/mutants.json`,
          {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: `Update: ${count} tiers from Telegram`,
              content: btoa(JSON.stringify(currentMutants, null, 2)),
              sha: fileData.sha,
              branch: 'main'
            })
          }
        );

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