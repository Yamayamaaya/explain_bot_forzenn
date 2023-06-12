import React, { useState } from "react";
import axios from "axios";

function App() {
    const [inputSets, setInputSets] = useState([{}]);
    const [contents, setContents] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleInputChange = (index, event) => {
        const { name, value } = event.target;
        const sets = [...inputSets];
        sets[index][name] = value;
        setInputSets(sets);
    };

    const handleAddSet = () => {
        setInputSets([...inputSets, { word: "", genre: "" }]);
    };

    const handleRemoveSet = (index) => {
        const sets = [...inputSets];
        sets.splice(index, 1);
        setInputSets(sets);
    };

    const handleSubmitToOpenAi = async () => {
        await Promise.all(
            inputSets.map(async (set) => {
                await getExplain(set.genre, set.word);
            })
        );
    };

    const handleContentChange = (index, event) => {
        const { value } = event.target;
        setContents((prevContents) => {
            const updatedContents = [...prevContents];
            updatedContents[index] = {
                ...updatedContents[index],
                content: value,
            };
            return updatedContents;
        });
    };

    const handleCheckChange = (index) => {
        setContents((prevContents) => {
            const updatedContents = [...prevContents];
            updatedContents[index] = {
                ...updatedContents[index],
                check: !updatedContents[index].check,
            };
            return updatedContents;
        });
    };

    const handleSubmitToZenn = async () => {
        // コンテンツのチェックが入っているものだけをループ処理で足し合わせる。
        const explains = contents
            .filter((content) => content.check)
            .map((content) => content.content)
            .join("\n\n");

        // Stateの初期化
        setInputSets([{}]);
        setContents([]);
        setLoading(false);

        // Zennへの投稿処理
        main(explains);
    };

    const API_URL = "https://api.openai.com/v1/";
    const MODEL = "gpt-3.5-turbo";
    const API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

    const getExplain = async (genre, word) => {
        setLoading(true);
        try {
            const prompt = `
              ${genre}に関する用語${word}について、以下の見出しで300字程度で解説するマークダウンファイルを作成してください。
              \`\`\`md
              ## [タイトル]
              - 概要
              - 具体例
              - 関連語句
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

            setContents((prevContents) => [...prevContents, newContent]);
            setLoading(false);
        } catch (error) {
            console.error("Error get explain: ", error);
        }
    };

    //--------------------------------------------
    const repoBApiUrl =
        "https://api.github.com/repos/{owner}/{repo}/contents/{path}";
    const owner = "Yamayamaaya";
    const repo = "zenn";
    const folder = "books/e8a8bb3abb437d";

    // MDファイルγの取得
    const getRequestUrl = (mdFile) => {
        return repoBApiUrl
            .replace("{owner}", owner)
            .replace("{repo}", repo)
            .replace("{path}", folder + "/" + mdFile);
    };

    // アクセストークンの取得
    const getToken = () => {
        return process.env.REACT_APP_ZENN_REPO_TOKEN;
    };

    const getHeaders = (token) => {
        return {
            Authorization: "Bearer " + token,
        };
    };

    const generateNewFileName = async () => {
        try {
            const today = new Date();
            const month = String(today.getMonth() + 1).padStart(2, "0");
            const day = String(today.getDate()).padStart(2, "0");
            const response = await axios.get(
                `https://api.github.com/repos/${owner}/${repo}/contents/${folder}`
            );

            const files = response.data;
            console.log("files", files);

            let maxNumber = 0;

            files.forEach((file) => {
                const match = file.name.match(/(\d+)\.(\d{2})(\d{2})\.md/);
                console.log("match", match);
                if (match && !(match[2] === month && match[3] === day)) {
                    const number = parseInt(match[1]);
                    if (number > maxNumber) {
                        maxNumber = number;
                    }
                }
            });
            const newNumber = maxNumber + 1;
            const newFileName = `${newNumber}.${month}${day}.md`;
            console.log("newFileName", newFileName);
            return newFileName;
        } catch (error) {
            console.log("Error generating new file name:", error);
            throw error;
        }
    };

    // MDファイルγの取得
    const fetchMDFile = async (url, headers) => {
        try {
            const response = await axios.get(url, { headers });
            if (response.status === 200) {
                return response.data;
            } else if (response.status === 404) {
                return null;
            } else {
                throw new Error("Failed to fetch MD file");
            }
        } catch (error) {
            if (error.response && error.response.status === 404) {
                return null;
            } else {
                console.log("Error fetching MD file:", error);
                throw error;
            }
        }
    };

    // MDファイルγの書き換えとプッシュ
    const updateMDFile = async (
        requestUrl,
        content,
        explains,
        headers,
        mdFile
    ) => {
        console.log("updateMDFile");
        console.log(content);
        let existingContent;
        let sha;

        if (content) {
            existingContent = decodeURIComponent(escape(atob(content.content))); // Base64デコード
            sha = content.sha;
            console.log("existingContent", existingContent);
        } else {
            existingContent = null;
            sha = null;
        }

        // 条件に応じてMDファイルγの内容を書き換える（ここに必要な処理を追加）
        let newContent;
        if (existingContent) {
            // 既存の内容に追記
            newContent = existingContent + "\n" + explains; // 新しいファイルの内容を指定
        } else {
            newContent = explains; // 新しいファイルの内容を指定
        }
        console.log("newContent", newContent);

        // 書き換えたMDファイルγをリポジトリBにプッシュ
        const data = {
            message: `Update ${mdFile}`,
            content: btoa(unescape(encodeURIComponent(newContent))), // Base64エンコード
            sha: sha,
        };

        const pushRequestOptions = {
            method: "PUT",
            headers: {
                ...headers,
            },
            responseType: "json",
            data: JSON.stringify(data),
        };
        console.log("pushRequestOptions", pushRequestOptions);

        try {
            const pushResponse = await axios.request({
                url: requestUrl,
                headers: pushRequestOptions.headers,
                method: pushRequestOptions.method,
                data: pushRequestOptions.data,
            });
            console.log("pushResponse", pushResponse);
            if (pushResponse.status === 200 || pushResponse.status === 201) {
                console.log(`Successfully updated ${mdFile}`);
            } else {
                console.log(`Failed to update ${mdFile}`);
            }
        } catch (error) {
            console.log("Error updating MD file:", error);
            throw error;
        }
    };

    // メインの処理フロー
    const main = async (explains) => {
        try {
            const mdFile = await generateNewFileName();
            const requestUrl = getRequestUrl(mdFile);
            const token = getToken();
            const headers = getHeaders(token);
            const content = await fetchMDFile(requestUrl, headers);
            await updateMDFile(requestUrl, content, explains, headers, mdFile);
        } catch (error) {
            console.error("Error:", error);
        }
    };

    return (
        <div>
            <header>
                <h1>タイトル</h1>
            </header>

            <main>
                <div id="input-fields">
                    {inputSets.map((set, index) => (
                        <div key={index} className="input-set mb-4">
                            <input
                                type="text"
                                name="word"
                                value={set.word}
                                placeholder="用語入力欄"
                                onChange={(e) => handleInputChange(index, e)}
                            />
                            <input
                                type="text"
                                name="genre"
                                value={set.genre}
                                placeholder="ジャンル入力欄"
                                onChange={(e) => handleInputChange(index, e)}
                            />
                            {index === inputSets.length - 1 && (
                                <>
                                    <button onClick={handleAddSet}>
                                        セット追加
                                    </button>
                                    <button
                                        onClick={() => handleRemoveSet(index)}
                                    >
                                        セット削除
                                    </button>
                                </>
                            )}
                        </div>
                    ))}
                    <button onClick={handleSubmitToOpenAi}>説明</button>
                    {loading && <p>ローディング中...</p>}
                </div>
                <div id="output-fields">
                    {
                        // console.log(contents)
                        contents.map((content, index) => (
                            <div key={index} className="output-set">
                                <textarea
                                    value={content.content}
                                    placeholder="文章出力欄"
                                    onChange={(e) =>
                                        handleContentChange(index, e)
                                    }
                                />
                                <input
                                    type="checkbox"
                                    checked={content.check}
                                    onChange={() => handleCheckChange(index)}
                                />
                            </div>
                        ))
                    }
                    <button onClick={handleSubmitToZenn}>zennに保存</button>
                </div>
            </main>

            <footer>
                <p>2023 ©️Yamayamaaya</p>
            </footer>
        </div>
    );
}

export default App;
