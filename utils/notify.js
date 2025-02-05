import nodemailer from "nodemailer";
import axios from "axios";
import env from "./env.js";
import pkg from "../package.json" assert { type: "json" };

export class Notify {
  /**
   * 邮件推送
   * @param options
   */
  async email(options) {
    const auth = {
      user: env.EMAIL_USER, // generated ethereal user
      pass: env.EMAIL_PASS, // generated ethereal password
    };

    if (!auth.user || !auth.pass || auth.user === "" || auth.pass === "") {
      throw new Error("未配置邮箱。");
    }

    const transporter = nodemailer.createTransport({
      host: "smtp." + auth.user.match(/@(.*)/)[1],
      secure: true,
      port: 465,
      auth,
      tls: {
        // do not fail on invalid certs
        rejectUnauthorized: false,
      },
    });

    // 处理内容格式
    let content = options.content;
    console.log(`（转换前）email 内容：${content}`);
    if (options.msgtype === "text") {
      // 将文本内容转换为 HTML，保留换行符
      content = content.replace(/\n/g, '<br>');
    }
    console.log(`（转换后）email 内容：${content}`);

    const template = `
<style>
  .dify-header {
    padding: 10px 0;
    border-bottom: 1px solid #f1f1f1;
    text-align: center;
  }
  .dify-header img {
    width: 480px;      /* 固定显示宽度 */
    height: auto;      /* 高度自适应 */
    object-fit: contain;
    vertical-align: middle;
  }
  .dify-update-tip {
    display: flex;
    justify-content: space-between;
    padding: 10px;
    font-size: 12px;
    background: #fff4e5;
    color: #663c00;
    text-decoration: none;
  }
  .dify-main {
    padding: 10px;
  }
  .dify-footer {
    padding: 10px 0;
    border-top: 1px solid #f1f1f1;
    text-align: center;
    font-size: 12px;
    color: #6e6e73;
  }
</style>
<section>
  <header class="dify-header">
    <img src="cid:cp-logo" width="120" alt="Company Logo" /> <!-- 修改 cid 和 alt -->
  </header>
  ${
    this.newVersion.has
      ? `<a class="dify-update-tip" href="${this.newVersion.url}" target="_blank"><span>魂伴每日新闻推送 ${this.newVersion.name} 现在可用 ›</span></a>`
      : ""
  }
  <main class="dify-main">
    ${content}
  </main>
  <footer class="dify-footer">
    <span>魂伴每日新闻推送${pkg.version}</span> |
    <span>Copyright © ${new Date().getFullYear()} <a href="https://github.com/Sibozhu" target="_blank">sibozhu</a></span>
  </footer>
</section>
`.trim();

    await transporter.sendMail({
      from: `魂伴新闻推送助手 <${auth.user}>`, // sender address
      to: env.EMAIL_TO, // list of receivers
      subject: options.title, // Subject line
      html: template, // html body
      headers: {
        "Content-Type": "text/html; charset=UTF-8"  // 明确指定为HTML内容
      },
      attachments: [
        {
          filename: "cp_logo_textonly.png",
          path: 'static/cp_logo_textonly.png',  // 本地图片路径
          cid: 'cp-logo'  // 必须与模板中的 cid 一致
        },
      ],
    });
  }

  /**
   * PushPlus推送
   * @param options
   */
  async pushplus(options) {
    const token = env.PUSHPLUS_TOKEN;
    if (!token || token === "") {
      throw new Error("未配置PushPlus Token。");
    }

    const config = {
      token,
      title: options.title,
      content: options.content,
      topic: "",
      template: "html",
      channel: "wechat",
      webhook: "",
      callbackUrl: "",
      timestamp: "",
    };

    return axios.post("http://www.pushplus.plus/send", config, {
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * serverPush推送
   * @param options
   */
  async serverPush(options) {
    const token = env.SERVERPUSHKEY;
    if (!token || token === "") {
      throw new Error("未配置Server酱 key。");
    }

    const config = {
      title: options.title,
      desp: options.content,
      channel: "9",
    };

    return axios.post(`https://sctapi.ftqq.com/${token}.send`, config, {
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * 钉钉Webhook
   * @param options
   */
  async dingtalkWebhook(options) {
    const url = env.DINGDING_WEBHOOK;
    if (!url || url === "") {
      throw new Error("未配置钉钉Webhook。");
    }

    return axios.post(url, {
      msgtype: "text",
      text: {
        content: `${options.content}`,
      },
    });
  }

  /**
   * 飞书Webhook
   * @param options
   */
  async feishuWebhook(options) {
    const url = env.FEISHU_WEBHOOK;
    if (!url || url === "") {
      throw new Error("未配置飞书Webhook。");
    }

    return axios.post(url, {
      msg_type: "interactive",
      card: {
        elements: [
          {
            tag: "markdown",
            content: options.content,
            text_align: "left",
          },
        ],
        header: {
          template: "blue",
          title: {
            content: options.title,
            tag: "plain_text",
          },
        },
      },
    });
  }

  /**
   * 企业微信Webhook
   * @param options
   */
  async wecomWebhook(options) {
    const url = env.WEIXIN_WEBHOOK;
    if (!url || url === "") {
      throw new Error("未配置企业微信Webhook。");
    }

    return axios.post(url, {
      msgtype: "text",
      text: {
        content: `${options.content}`,
      },
    });
  }

  async weixinWebhook(options) {
    return this.wecomWebhook(options);
  }

  /**
   * 微秘书webhook
   * @param options
   */
  async wimishuWebhook(options) {
    const url = env.AIBOTK_HOOK;
    if (!url || url === "") {
      throw new Error("未配置微秘书Hook地址");
    }
    let res = "";
    if (env.AIBOTK_ROOM_RECIVER) {
      console.log(`微秘书推送给群组：${env.AIBOTK_CONTACT_RECIVER}`);
      res = await axios.post(url + "/openapi/v1/chat/room", {
        apiKey: env.AIBOTK_KEY,
        roomName: env.AIBOTK_ROOM_RECIVER,
        message: {
          type: 1,
          content: `${options.content}`,
        },
      });
      console.log(`微秘书推送给群组结果：${res.data}`);
    }
    if (env.AIBOTK_CONTACT_RECIVER) {
      console.log(`微秘书推送给好友：${env.AIBOTK_CONTACT_RECIVER}`);
      res = await axios.post(url + "/openapi/v1/chat/contact", {
        apiKey: env.AIBOTK_KEY,
        name: env.AIBOTK_CONTACT_RECIVER,
        message: {
          type: 1,
          content: `${options.content}`,
        },
      });
      console.log(`微秘书推送给好友结果：${res.data}`);
    }
    return res;
  }

  newVersion = {
    has: false,
    name: pkg.version,
    url: pkg.homepage,
  };

  async checkupdate() {
    try {
      const result = await axios.get(pkg.releases_url);
      const data = result.data[0];
      this.newVersion.has = pkg.version < data.tag_name.replace(/^v/, "");
      this.newVersion.name = data.tag_name;
    } catch (e) {}
  }

  async pushMessage(options) {
    // 在发送前添加内容验证
    if (!options.content) {
      console.error('推送内容为空，取消发送');
      return;
    }

    const trycatch = async (name, fn) => {
      try {
        await fn(options);
        console.log(`[${name}]: 消息推送成功!`);
      } catch (e) {
        console.log(`[${name}]: 消息推送失败! 原因: ${e.message}`);
      }
    };

    await this.checkupdate();
    if (this.newVersion.has) {
      console.log(`魂伴每日新闻推送 ${this.newVersion.name} 现在可用`);
    }

    await trycatch("邮件", this.email.bind(this));
    await trycatch("钉钉", this.dingtalkWebhook.bind(this));
    await trycatch("微信", this.wecomWebhook.bind(this));
    await trycatch("微秘书", this.wimishuWebhook.bind(this));
    await trycatch("PushPlus", this.pushplus.bind(this));
    await trycatch("Server酱", this.serverPush.bind(this));
    await trycatch("飞书", this.feishuWebhook.bind(this));
  }
}

export default new Notify();
