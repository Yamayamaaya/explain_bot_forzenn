import React, { useState } from "react";
import axios from "axios";

function App() {
    const [inputSets, setInputSets] = useState([{}]);
    const [contents, setContents] = useState([{}]);
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
        <div className="flex flex-col">
            <header className="text-center sticky top-0">
                <h1 className="text-3xl font-bold text-blue-50 bg-blue-900">
                    Explain Bot For zenn
                </h1>
            </header>

            <main className="my-4 h-screen flex-grow ">
                <div
                    id="input-fields"
                    className="sm:container mx-auto my-10 flex flex-col items-center "
                >
                    {inputSets.map((set, index) => (
                        <div
                            key={index}
                            className="input-set mb-4 flex justify-between w-2/3"
                        >
                            <input
                                type="text"
                                name="word"
                                value={set.word}
                                placeholder="用語入力欄"
                                onChange={(e) => handleInputChange(index, e)}
                                className="border rounded px-2 py-1 mr-2"
                            />
                            <input
                                type="text"
                                name="genre"
                                value={set.genre}
                                placeholder="ジャンル入力欄"
                                onChange={(e) => handleInputChange(index, e)}
                                className="border rounded px-2 py-1 mr-8"
                            />
                            {index === inputSets.length - 1 && (
                                <div>
                                    <button
                                        onClick={handleAddSet}
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded ml-2"
                                    >
                                        セット追加
                                    </button>
                                    <button
                                        onClick={() => handleRemoveSet(index)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded ml-2"
                                    >
                                        セット削除
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                    <button
                        onClick={handleSubmitToOpenAi}
                        className="bg-blue-600 hover:bg-blue-700 w-1/6 text-white font-bold py-1 px-2 rounded"
                    >
                        説明
                    </button>
                    {loading && (
                        <div role="status">
                            <svg
                                aria-hidden="true"
                                class="inline w-8 h-8 mr-2 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
                                viewBox="0 0 100 101"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                                    fill="currentColor"
                                />
                                <path
                                    d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                                    fill="currentFill"
                                />
                            </svg>
                            <span class="sr-only">Loading...</span>
                        </div>
                    )}
                </div>
                <div
                    id="output-fields"
                    className="sm:container mx-auto my-10 flex flex-col items-center"
                >
                    {contents.map((content, index) => (
                        <div
                            key={index}
                            className="output-set w-2/3 mb-4 flex justify-center"
                        >
                            <textarea
                                value={content.content}
                                placeholder="文章出力欄"
                                onChange={(e) => handleContentChange(index, e)}
                                className="border rounded px-2 py-1 mr-2 grow h-60"
                            />
                            <input
                                type="checkbox"
                                checked={content.check}
                                onChange={() => handleCheckChange(index)}
                                className="mr-2"
                            />
                        </div>
                    ))}
                    <button
                        onClick={handleSubmitToZenn}
                        className="bg-blue-600 hover:bg-blue-700 w-1/6 text-white font-bold py-1 px-2 rounded "
                    >
                        zennに保存
                    </button>
                </div>
            </main>

            <footer className="text-center mt-4 text-blue-50 bg-blue-900">
                <p>2023 ©️Yamayamaaya</p>
            </footer>
        </div>
    );
}

export default App;
