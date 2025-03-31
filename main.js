const axios = require('axios');
const fs = require('fs');
const readline = require('readline');
const colors = require('colors');

const questionsUrl = 'https://raw.githubusercontent.com/mobonchain/Hyperbolic/main/questions.txt';

function checkApiKey() {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync('apikey.json')) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.question('Chưa có API Key, vui lòng điền vào API Key : ', (apiKey) => {
        const apiKeyData = { apiKey };
        fs.writeFileSync('apikey.json', JSON.stringify(apiKeyData));
        console.log('API key saved.');
        rl.close();
        resolve(apiKey);
      });
    } else {
      const apiKey = JSON.parse(fs.readFileSync('apikey.json')).apiKey;
      resolve(apiKey);
    }
  });
}

async function getQuestionsFromGitHub() {
  try {
    const response = await axios.get(questionsUrl);
    const questionsText = response.data;

    const questions = questionsText.split('\n')
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(line => line !== '');

    return questions;
  } catch (error) {
    console.error('Lỗi khi gửi câu hỏi :', error);
    return [];
  }
}

async function sendQuestion(question, apiKey) {
  const url = 'https://api.hyperbolic.xyz/v1/chat/completions';
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  };

  const data = {
    messages: [{ role: 'user', content: question }],
    model: 'meta-llama/Llama-3.2-3B-Instruct',
    max_tokens: 512,
    temperature: 0.7,
    top_p: 0.9
  };

  try {
    const response = await axios.post(url, data, { headers });
    console.log(colors.green(`Gửi câu hỏi thành công : "${question}"`));
    return response.data;
  } catch (error) {
    console.log(colors.red('Lỗi khi gửi câu hỏi :', error));
    return null;
  }
}

async function main() {
  try {
    const apiKey = await checkApiKey();

    const questions = await getQuestionsFromGitHub();

    if (questions.length > 0) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.question('Nhập thời gian giữa các câu hỏi ( tính bằng giây ): ', async (delayTime) => {
        const delayInMs = parseInt(delayTime) * 1000;

        for (const question of questions) {
          console.log(colors.cyan('Đang gửi câu hỏi...'));
          const response = await sendQuestion(question, apiKey);

          if (response) {
            console.log(colors.green(`Nhận phản hồi thành công cho câu hỏi : "${question}"`));
          } else {
            console.log(colors.red(`Nhận phản hồi thất bại cho câu hỏi : "${question}"`));
          }

          console.log(`Chờ ${delayInMs / 1000} trước khi gửi câu hỏi tiếp theo...`);
          await new Promise(resolve => setTimeout(resolve, delayInMs));
        }

        console.log(colors.magenta('Toàn bộ câu hỏi đã được gửi.'));
        rl.close();
      });
    } else {
      console.log(colors.red('No questions found.'));
    }
  } catch (error) {
    console.error(colors.red('Error in the process:', error));
  }
}

main();
