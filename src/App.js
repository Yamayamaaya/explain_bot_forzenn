import React, { useState } from "react";
import axios from "axios";

function App() {
    const [inputSets, setInputSets] = useState([{ term: "", genre: "" }]);

    const handleInputChange = (index, event) => {
        const { name, value } = event.target;
        const sets = [...inputSets];
        sets[index][name] = value;
        setInputSets(sets);
    };

    const handleAddSet = () => {
        setInputSets([...inputSets, { term: "", genre: "" }]);
    };

    const handleRemoveSet = (index) => {
        const sets = [...inputSets];
        sets.splice(index, 1);
        setInputSets(sets);
    };

    const handleSubmit = () => {
        main();
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
            console.log("generateNewFileNameError:", error);
        }
    };

    // MDファイルγの取得
    const fetchMDFile = (url, headers) => {
        return axios
            .get(url, { headers })
            .then((response) => {
                if (response.status === 200) {
                    return response.data;
                } else if (response.status === 404) {
                    return null;
                } else {
                    throw new Error("Failed to fetch MD file");
                }
            })
            .catch((error) => {
                if (error.response && error.response.status === 404) {
                    return null;
                } else {
                    throw error;
                }
            });
    };

    // MDファイルγの書き換えとプッシュ
    const updateMDFile = (requestUrl, content, headers, mdFile) => {
        console.log("updateMDFile");
        console.log(content);
        let existingContent;
        let sha;

        if (content) {
            existingContent = atob(content.content); // Base64デコード
            sha = content.sha;
            console.log("existingContent", existingContent);
        } else {
            existingContent = null;
            sha = null;
        }

        // 条件に応じてMDファイルγの内容を書き換える（ここに必要な処理を追加）
        let newContent;
        if (existingContent) {
            newContent = existingContent.toUpperCase(); // 例: 内容を大文字に変換
        } else {
            newContent = "New file content"; // 新しいファイルの内容を指定
        }
        console.log("newContent", newContent);

        // 書き換えたMDファイルγをリポジトリBにプッシュ
        const data = {
            message: `Update ${mdFile}`,
            content: btoa(newContent), // Base64エンコード
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

        return axios
            .request({
                url: requestUrl,
                headers: pushRequestOptions.headers,
                method: pushRequestOptions.method,
                data: pushRequestOptions.data,
            })
            .then((pushResponse) => {
                console.log("pushResponse", pushResponse);
                if (
                    pushResponse.status === 200 ||
                    pushResponse.status === 201
                ) {
                    console.log(`Successfully updated ${mdFile}`);
                } else {
                    console.log(`Failed to update ${mdFile}`);
                }
            });
    };

    // メインの処理フロー
    const main = async () => {
        try {
            const mdFile = await generateNewFileName();
            const requestUrl = getRequestUrl(mdFile);
            const token = getToken();
            const headers = getHeaders(token);

            const content = await fetchMDFile(requestUrl, headers);
            await updateMDFile(requestUrl, content, headers, mdFile);
        } catch (error) {
            console.error("Error:", error);
        }
    };

    //--------------------------------------------
    return (
        <div className="flex flex-col min-h-screen">
            <header className="fixed top-0 w-full bg-gray-800 text-white py-4 px-8">
                <h1 className="text-2xl">タイトル</h1>
            </header>

            <main className="flex-1 pt-10">
                <div id="input-fields" className="py-8 px-8">
                    {inputSets.map((set, index) => (
                        <div key={index} className="input-set mb-4">
                            <input
                                type="text"
                                name="term"
                                value={set.term}
                                placeholder="用語入力欄"
                                onChange={(e) => handleInputChange(index, e)}
                                className="border border-gray-300 rounded py-2 px-4 mr-2 focus:outline-none focus:border-blue-500"
                            />
                            <input
                                type="text"
                                name="genre"
                                value={set.genre}
                                placeholder="ジャンル入力欄"
                                onChange={(e) => handleInputChange(index, e)}
                                className="border border-gray-300 rounded py-2 px-4 mr-2 focus:outline-none focus:border-blue-500"
                            />
                            {index === inputSets.length - 1 && (
                                <>
                                    <button
                                        onClick={handleAddSet}
                                        className="bg-blue-500 text-white py-2 px-4 rounded mr-2"
                                    >
                                        セット追加
                                    </button>
                                    <button
                                        onClick={() => handleRemoveSet(index)}
                                        className="bg-red-500 text-white py-2 px-4 rounded"
                                    >
                                        セット削除
                                    </button>
                                </>
                            )}
                        </div>
                    ))}
                </div>

                <button
                    onClick={handleSubmit}
                    className="bg-green-500 text-white py-2 px-4 rounded ml-8 mb-8"
                >
                    送信
                </button>
            </main>

            <footer className="fixed bottom-0 w-full bg-gray-800 text-white py-4 px-8">
                <p>2023 ©️Yamayamaaya</p>
            </footer>
        </div>
    );
}

export default App;
