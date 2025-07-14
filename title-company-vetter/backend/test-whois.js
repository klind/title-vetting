import net from 'net';

async function testWhois(domain) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let response = '';
    
    const timeout = setTimeout(() => {
      client.destroy();
      reject(new Error('WHOIS query timed out'));
    }, 30000);
    
    client.connect(43, 'whois.verisign-grs.com', () => {
      console.log(`📡 Connected to whois.verisign-grs.com`);
      
      const query = `domain ${domain}`;
      console.log(`🔍 Sending query: ${query}`);
      client.write(query + '\r\n');
    });
    
    client.on('data', (data) => {
      response += data.toString();
    });
    
    client.on('end', () => {
      clearTimeout(timeout);
      console.log(`✅ Received response from whois.verisign-grs.com`);
      console.log(`[WHOIS] Raw response:`);
      console.log('='.repeat(80));
      console.log(response);
      console.log('='.repeat(80));
      resolve(response);
    });
    
    client.on('error', (error) => {
      clearTimeout(timeout);
      console.error(`❌ WHOIS query error:`, error);
      reject(error);
    });
    
    client.on('close', () => {
      clearTimeout(timeout);
    });
  });
}

// Test with bchhtitle.com
testWhois('bchhtitle.com')
  .then(response => {
    console.log('WHOIS lookup completed successfully');
  })
  .catch(error => {
    console.error('WHOIS lookup failed:', error);
  }); 