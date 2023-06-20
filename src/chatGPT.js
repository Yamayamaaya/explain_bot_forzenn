import axios from "axios";

const API_URL = "https://api.openai.com/v1/";
const MODEL = "gpt-3.5-turbo";
const API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

export const getExplain = async (genre, word) => {
    try {
        const prompt = `
              ${genre}に関する用語、${word}について、以下の見出しで300字程度で解説するマークダウンファイルを作成してください。
              \`\`\`md
              ## タイトル
              - 概要
                - <概要本文> 
              - 具体例
                - <具体例本文>
              - 関連語句
                - <関連語句1>
                - <関連語句2>
              \`\`\`
              `;
        const response = await axios.post(
            `${API_URL}chat/completions`,
            {
                model: MODEL,
                messages: [
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${API_KEY}`,
                },
            }
        );

        const newContent = {
            content: response.data.choices[0].message.content,
            check: false,
        };

        return newContent;
    } catch (error) {
        console.error("Error get explain: ", error);
    }
};
