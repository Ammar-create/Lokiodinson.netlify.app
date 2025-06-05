<input id="userInput" placeholder="Ask something..." />
<button onclick="sendMessage()">Send</button>
<div id="response"></div>

<script>
  async function sendMessage() {
    const msg = document.getElementById("userInput").value;
    const res = await fetch("/.netlify/functions/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg }),
    });
    const data = await res.json();
    document.getElementById("response").innerText = "🤖: " + data.reply;
  }
</script>