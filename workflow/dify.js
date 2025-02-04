import { WorkflowClient } from '../sdk/dify.js'
import env from '../utils/env.js'
import Notify from "../utils/notify.js";

class Task {
    constructor(dify) {
      this.dify = dify;
    }

    taskName = "";

    async run() {}

    toString() {
      return `[${this.taskName}]`;
    }
}

class WorkflowTask extends Task {
    taskName = "Dify工作流任务";

    async run() {
      if(!env.DIFY_BASE_URL) {
        throw new Error("没有配置Dify api地址，请检查后执行!");
      }
      let inputs = {}
      try {
        inputs = env.DIFY_INPUTS ? JSON.parse(env.DIFY_INPUTS) : {}
      } catch (error) {
        console.error('DIFY_INPUTS 格式错误，请确保是json格式, 可能会影响任务流执行')
      }
      const user = 'dify-schedule'
      const workflow = new WorkflowClient(this.dify.token, env.DIFY_BASE_URL);
      console.log(`正在获取Dify工作流基础信息...`)
      const info = await workflow.info(user);
      this.workfolwName = info.data?.name || '';
      console.log(`Dify工作流【${info.data.name}】开始执行...`)
      const response =  await workflow.getWorkflowResult(inputs, user,true)
      // 新增：深度解析嵌套 JSON
      try {
        const rawData = JSON.parse(response.text); // 第一次解析
        if (typeof rawData === 'string') {
          // 如果 rawData 仍然是字符串，再次解析
          const parsedData = JSON.parse(rawData);
          this.result = parsedData.outputs || ''; // 提取 outputs 字段
        } else {
          this.result = rawData.outputs || ''; // 提取 outputs 字段
        }
      } catch (error) {
        console.error('解析工作流结果失败:', error);
        this.result = '内容解析错误，请检查日志';
      }
    }

    toString() {
        return this.result
    }
}

async function run(args) {
    const tokens = env.DIFY_TOKENS.split(';');
    let messageList = [];
    for (let token of tokens) {
      const workflow = new WorkflowTask({token});

      await workflow.run(); // 执行

      const content = workflow.toString();

      console.log(content); // 打印结果

      messageList.push(content);
    }

    const message = messageList.join(`\n${"-".repeat(15)}\n`);
    Notify.pushMessage({
      title: "每日具身文娱新闻推送",
      content: message,
      msgtype: "text"
    });
  }

  run(process.argv.splice(2)).catch(error => {
    Notify.pushMessage({
      title: "",
      content: `Error: ${error.message}`,
      msgtype: "html"
    });

    throw error;
  });