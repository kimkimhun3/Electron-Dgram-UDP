document.getElementById('buffer2-check').addEventListener('change', handleBuffer2Check);
  function handleBuffer2Check() {
    const checkbox = document.getElementById('buffer2-check');
    
    if (checkbox.checked) {
      console.log('B2 Switched!');
      // Perform Buffer 2 function or related inputs
      //handleBuffer2Execute();
    } else {
      document.getElementById('buffer2-times').value = 0;
      document.getElementById('buffer2-repetition').value = 0;
      // Stop the server if it is running
      if (server || client) {
        server.close();
        client.close();
        client = null;
        server = null;
        console.log('B2 Client and Server stopped.');
      }
    }
  }