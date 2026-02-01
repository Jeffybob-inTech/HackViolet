🧮 SafeCalc
SafeCalc is a personal safety app disguised as a fully functional calculator. Behind a discreet passcode, users can instantly activate safety features—like a fake phone call with an AI agent—to create a believable exit from potentially dangerous situations.

💡 Inspiration
Protection for Women
Going on dates, spending time at bars, and socializing should be experiences where women feel safe enough to relax and enjoy themselves. Unfortunately, many women face the persistent fear of being drugged, harassed, or attacked in these settings.
According to Spiked Substances (Alcohol), approximately 56% of women report being unknowingly spiked, and since many cases go unreported, the real number is likely even higher. When women find themselves in uncomfortable or unsafe situations, there are often few discreet and immediate ways to get out.
SafeCalc was created to give women a subtle, fast, and reliable escape tool—right from their phone.

🚨 What It Does


A calculator interface with hidden input combinations that unlock safety features


Fake phone call with a customizable AI agent for realistic conversations


Automated distress texts sent to trusted contacts


Live location sharing for added security


All features are designed to remain discreet and believable in high-stress situations.

🛠 How We Built It


Frontend: React Native with Expo


Backend: Express.js


AI & Voice: Gemini, ElevenLabs


Speech Processing: Groq


Using Groq, we rapidly convert the user’s spoken responses into text, which is then sent to Gemini for dialogue generation. The generated response is passed to ElevenLabs, producing high-quality, natural-sounding audio. This pipeline allows SafeCalc to simulate a realistic phone conversation with minimal latency while maintaining audio quality.

⚔️ Challenges We Ran Into
Merge Conflicts
With multiple teammates coding simultaneously under a tight deadline, merge conflicts were unavoidable. While frustrating, we worked through them collaboratively and successfully completed the project.
AI Agent Response Delay
Initially, the AI conversation pipeline (Groq → Gemini → ElevenLabs) caused a ~5 second delay in responses. We optimized the workflow to achieve near-instant replies, accepting a slight decrease in response depth to preserve realism and usability.
Lack of Sleep ☕
A 24-hour hackathon meant long nights, lots of caffeine, and powering through exhaustion—but we made it.

🏆 Accomplishments We’re Proud Of


A fully functional mobile app completed within 24 hours


Successful integration of real-time AI voice interaction


Tackling a real-world safety issue with meaningful impact


Completing our first-ever hackathon project as a team



🤝 Our Attitude
Throughout the entire hackathon, we worked nonstop and supported one another as a team. Despite having to relocate twice and working late into the night, we stayed focused, solved bugs together, and delivered a product we’re genuinely proud of.

📚 What We Learned


How to integrate ElevenLabs for AI voice customization


Mobile development with React Native and Expo


Building and connecting API-driven AI systems


Optimizing AI pipelines for low latency and usability



🔮 What’s Next for SafeCalc
Making safety easily accessible for women remains our top priority. Next steps include:


More adaptive AI conversations based on user context


User-controlled urgency levels during emergencies


Expanded voice customization, including accents and tones


A community safety feature allowing women—especially college students and young adults—to connect and support one another directly through the app



SafeCalc is just the beginning. Our goal is to continue building tools that empower women to feel safer—anytime, anywhere. 💜
