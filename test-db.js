async function runTest() {
  console.log('1. Creating a new session...');
  const createRes = await fetch('http://localhost:3001/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Database Test Sprint' })
  });
  
  const session = await createRes.json();
  console.log('Result:', session);
  
  if (!session.roomCode) {
    console.error('Failed to create session');
    return;
  }
  
  console.log('\n2. Fetching session by room code:', session.roomCode);
  const getRes = await fetch(`http://localhost:3001/api/sessions/${session.roomCode}`);
  const fetched = await getRes.json();
  console.log('Result:', fetched);
}

runTest().catch(console.error);
