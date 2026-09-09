const fs = require('fs');

async function main() {
  const config = JSON.parse(fs.readFileSync('C:\\Users\\bhuvana\\.config\\configstore\\firebase-tools.json', 'utf8'));
  const token = config.tokens.access_token;
  
  const projectId = 'elitestudytracker';
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/admin_roles/JgBFUFXcI1WiFCGROA1iThdcUqo2`;
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fields: {
        uid: { stringValue: 'JgBFUFXcI1WiFCGROA1iThdcUqo2' },
        createdAt: { timestampValue: new Date().toISOString() }
      }
    })
  });
  
  console.log(response.status);
  console.log(await response.text());
}

main();
