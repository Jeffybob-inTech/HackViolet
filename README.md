#Inspiration
Protection For Women
Going on dates, spending time at bars, and socializing in general should be situations where women feel safe enough to let loose and enjoy themselves. Yet for many women today, these situations come with the prevalent issue and an underlying fear of being drugged, harassed, or attacked. According to Spiked Substances (Alcohol), about 56% of women reported being unknowingly spiked, and because many cases go unreported, this number is likely even larger. When women find themselves in dangerous and uncomfortable situations, they are often left with no discreet or safe way out of the situation.

#What It Does
Calculator interface with hidden combinations that lead the user to different safety features
Safety features include a fake phone call with a customizable AI agent, automated distress texts to trusted individuals, and safety location sharing
How We Built It
With the help of React Native, Expo, ChatGPT, and Gemini, we developed the frontend and backend using Express.js and Gemini, integrating ElevenLabs for the AI voice functionality.

#Using Groq, we are able to quickly translate users' spoken responses into text that is then used to prompt Gemini. After Gemini creates a response, the output is then fed into ElevenLabs, which allows turns the text into high-quality audio. As a result, our mobile app is able to actively respond to the user promptly, imitating a real conversation. Our app has been optimized to balance both low latency and quality output.

#Challenges We Ran Into
Merge Conflicts
Due to the time crunch, we had multiple people working on the code at the same time. This created merge conflicts when pushing the code. Although this issue was incredibly annoying, we persisted and were able to complete our project.

#AI Agent Delay
We came across an issue with the AI Agent having a delayed response when having a conversation with the user. The user would say a statement, but then that statement had to be processed by Groq, Gemini, and ElevenLabs, which ended up taking about 5 seconds to formulate a response. We eventually solved this issue so that the AI Agent would respond instantly, but the quality of the responses slightly decreased.

#Lack of Sleep
With the time crunch, we had no choice but to stay up to finish our project. This took a lot of caffeine to accomplish, but we did it!

#Accomplishments That We're Proud Of
Our Final Product
We are incredibly proud of our final product, especially knowing that we were able to accomplish so much within the 24-hour time limit. It was all of our first time officially participating in a hackathon, and we are proud of what we produced. Not only is our app fully functional, but it also positively impacts an issue that is still very prevalent in the present day among women around the world.

#Our Attitude
Throughout the entire 24-hour allotted time, we worked nonstop, sticking together as a team throughout the entire hackathon. Having to relocate 2 different times was frustrating, but as a team, we collectively overcame this hurdle. Additionally, we had to work late into the night to ensure that we would be able to finish SafeCalc by the submission time. Despite how tired we were, we persisted through all of the bugs and errors, and ultimately were able to produce a product that we were all proud of.

#What We Learned
How to use ElevenLabs to customize an AI agent
How to use React Native for mobile development through Expo
How to use APIs
What's Next For SafeCalc
Easily accessible safety for women is our top priority. With this in mind, SafeCalc's next step is to expand our security measures. We plan to expand our AI conversation to be more adaptable, taking into account the user's personal situation, as well as allowing them to control the level of urgency in the situation. In addition to this, we plan to expand to make the AI agent's voice more customizable, being inclusive to people of all types of accents.

#We understand that the main victims in these dangerous (and potentially fatal) situations are mainly college students and younger women who usually go on outings in groups. To tailor towards this demographic, we plan on implementing a community safety feature that allows women to connect with each other directly through the app.
