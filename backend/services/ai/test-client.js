const testStream = async () => {
    const response = await fetch("http://localhost:3002/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            prompt: "Hello! My name is Vishesh.", 
            threadId: "test_thread_123" 
        })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkStrings = decoder.decode(value).split("\n\n");
        for (const chunkStr of chunkStrings) {
            if (chunkStr.startsWith("data: ")) {
                const data = chunkStr.replace("data: ", "");
                if (data === "[DONE]") return console.log("\n\n--- DONE ---");
                try {
                    const parsed = JSON.parse(data);
                    process.stdout.write(parsed.chunk); // Types it out like ChatGPT
                } catch (e) {}
            }
        }
    }
};

testStream();