console.log(Array(process.stdout.rows + 1).join("\n"));
let mode = "ASCII";
let options = {
  brk: false,
  cts: false,
  dsr: false,
  dtr: true,
  rts: true,
  lowLatency: true,
  endchar: "\r\n",
};
let timeOptions = {
  actualTime: false,
  elapsed: true,
  afterCommand: false,
};

const fs = require("fs");
let { SerialPort, ReadlineParser } = require("serialport");
const color = require("./colors");

const searchHistory = (filter) => {
  const history = fs.readFileSync("./history").toString().split("\n");
  let a = history.filter((cmd) => cmd.includes(filter));
  if (filter.length > 0) a.push(filter);
  return a;
};

let comport = "/dev/ttyUSB0";
let baudRate = 115200;
if (process.argv.length > 2) {
  comport = process.argv[2];
  baudRate = parseInt(process.argv[3]);
} else {
  console.log("Usage: node ctty.js <comport> <baudrate>");
  console.log("Example: node ctty.js /dev/ttyUSB0 115200");
  SerialPort.list()
    .then((ports) => {
      console.log("Available ports:");
      ports.forEach((port) => console.log(port.path));
      process.exit(1);
    })
    .catch((e) => {
      console.log(e);
      process.exit(1);
    });
}

if (!fs.existsSync("./history")) {
  fs.appendFileSync("./history", "");
}

let port = new SerialPort({ path: comport, baudRate: baudRate }, false);
const parser = new ReadlineParser({ delimiter: "\r\n" });

let lastTime = new Date().getTime();
let lastTimeEBEL = new Date().getTime();
const getActuelTime = () => {
  let d = new Date();
  return `${d.getHours() < 10 ? "0" + d.getHours() : d.getHours()}:${d.getMinutes() < 10 ? "0" + d.getMinutes() : d.getMinutes()}:${d.getSeconds() < 10 ? "0" + d.getSeconds() : d.getSeconds()}:${
    d.getMilliseconds() < 10 ? "00" + d.getMilliseconds() : d.getMilliseconds() < 100 ? "0" + d.getMilliseconds() : d.getMilliseconds()
  }`;
};

const getTimeElapsedBetweenEachLine = () => {
  const d = new Date().getTime();
  const elapsed = d - lastTimeEBEL;
  lastTimeEBEL = d;
  const hours = Math.floor(elapsed / (1000 * 60 * 60));
  const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
  const milliseconds = elapsed % 1000;
  return `${hours < 10 ? "0" + hours : hours}:${minutes < 10 ? "0" + minutes : minutes}:${seconds < 10 ? "0" + seconds : seconds}:${
    milliseconds < 10 ? "00" + milliseconds : milliseconds < 100 ? "0" + milliseconds : milliseconds
  }`;
};

const getTimeElapsedAfterCommandSent = () => {
  const d = new Date().getTime();
  const elapsed = d - lastTime;
  const hours = Math.floor(elapsed / (1000 * 60 * 60));
  const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
  const milliseconds = elapsed % 1000;
  return `${hours < 10 ? "0" + hours : hours}:${minutes < 10 ? "0" + minutes : minutes}:${seconds < 10 ? "0" + seconds : seconds}:${
    milliseconds < 10 ? "00" + milliseconds : milliseconds < 100 ? "0" + milliseconds : milliseconds
  }`;
};

const setLastTime = () => {
  lastTime = new Date().getTime();
};

port.on("close", (e) => console.log(e ? e : "port closed"));
port.on("open", () => console.log(`port open. Data rate: ${port.baudRate}`));
port.on("update", () => console.log(`port updated. Data rate: ${port.baudRate}`));

port.pipe(parser);
parser.on("data", (d) => {
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  console.log(
    (timeOptions.actualTime ? getActuelTime() + " " : "") +
      (timeOptions.elapsed ? getTimeElapsedBetweenEachLine() + " " : "") +
      (timeOptions.afterCommand ? getTimeElapsedAfterCommandSent() + " " : "") +
      "<",
    color.blue,
    d,
    color.reset
  );
  process.stdout.write("- " + process.stdin.currentLine);
});
parser.on("error", (d) => console.log("err: ", d));

process.on("signal", async (signal) => {
  console.log(signal);
});

process.stdin.setRawMode(true);
process.stdin.currentLine = "";
const defaultlast = 0;
let last = defaultlast;

let cursorPosition = 0;

let filter = "";

process.stdin.on("data", (data) => {
  const charAsAscii = data.toString().charCodeAt(0);

  if (process.stdin.currentLine.length > cursorPosition) {
    cursorPosition = process.stdin.currentLine.length;
  }

  // console.log(cursorPosition);

  //#TODO: make it work (arrow keys to navigate through the last commands && arrow keys to navigate through the current line)
  const str = data.toString();
  if (str.length == 3) {
    let arrow = str.charCodeAt(2);
    // left arrow = 68
    // right arrow = 67
    // up arrow = 65
    // down arrow = 66
    // process.stdin.currentLine = process.stdin.currentLine.slice(0, -1);
    // console.log(process.stdin.currentLine.toString("hex"));

    // process.stdin.currentLine = "";
    if (arrow == 67) {
      // console.log("right");
      return;
    }
    if (arrow == 68) {
      // console.log("left");
      // process.stdin.currentLine = process.stdin.currentLine.slice(0, -1);
      if (process.stdin.currentLine.length === 0 || cursorPosition === 0) return;
      // const before = process.stdin.currentLine.slice(0, cursorPosition - 1);
      // const after = process.stdin.currentLine.slice(cursorPosition);
      // process.stdin.currentLine = before;
      // cursorPosition--;
      // process.stdout.clearLine();
      // process.stdout.cursorTo(0);
      // process.stdout.write("- " + process.stdin.currentLine);
      // process.stdout.cursorTo(cursorPosition + 2);
      return;
    }
    //arrow down
    if (arrow == 66) {
      // console.log("down");
      if (filter.length === 0) {
        const cmds = searchHistory("");
        if (last <= 1) return;
        last--;
        if (last > cmds.length) return;
        const l = cmds[cmds.length - last];
        process.stdin.currentLine = l;
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write("- " + process.stdin.currentLine);
      } else {
        const cmds = searchHistory(filter);
        if (cmds.length === 0) return;
        if (last <= 1) return;
        last--;
        if (last > cmds.length) return;
        const l = cmds[cmds.length - last];
        process.stdin.currentLine = l;
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write("- " + process.stdin.currentLine);
      }
      return;
    }

    //arrow up
    if (arrow == 65) {
      // console.log("up");
      if (filter.length === 0) {
        if (last < 0) return;
        const cmds = searchHistory("");

        if (last >= cmds.length) return;
        last++;
        const l = cmds[cmds.length - last];
        process.stdin.currentLine = l;
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write("- " + process.stdin.currentLine);
      } else {
        const cmds = searchHistory(filter);
        if (cmds.length === 0) return;
        if (last < 0) return;
        if (last >= cmds.length) return;
        last++;
        const l = cmds[cmds.length - last];
        process.stdin.currentLine = l;
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write("- " + process.stdin.currentLine);
      }
      return;
    }
  }

  switch (charAsAscii) {
    //ctrl + c
    case 0x03:
      process.stdin.currentLine = "";
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      last = defaultlast;
      break;

    //ctrl + backspace
    case 0x08:
      if (process.stdin.currentLine.length === 0) return;
      if (process.stdin.currentLine.at(-1) === " ") {
        process.stdin.currentLine = process.stdin.currentLine.slice(0, -1);
      }
      let toRemove = process.stdin.currentLine.split(" ").at(-1).length;
      if (toRemove === 0) return;
      if (process.stdin.currentLine.at(-1) === " ") {
        toRemove++;
      }
      cursorPosition -= toRemove;
      process.stdin.currentLine = process.stdin.currentLine.slice(0, -toRemove);
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      process.stdout.write("- " + process.stdin.currentLine);
      break;

    //ctrl + d
    case 0x04:
      process.exit(0);
      break;

    //ctrl + l
    case 0x0c:
      console.log(Array(process.stdout.rows + 1).join("\n"));
      break;

    // // TODO: make a ctrl+h to see history

    //ctrl + m / enter
    case 0x0d:
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      process.stdin.emit("line", process.stdin.currentLine);
      process.stdin.currentLine = "";
      break;

    // ctrl + u / backspace
    case 0x7f:
      process.stdin.currentLine = process.stdin.currentLine.slice(0, -1);
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      process.stdout.write("- " + process.stdin.currentLine);
      last = defaultlast;
      break;

    // ctrl + o
    case 0x0f:
      if (port) {
        try {
          console.log("trying to close port");

          port.close((e) => {
            if (e) console.log(e);
            else console.log("Port closed");
          });
          if (!port.isOpen) {
            port = null;
          } else {
            console.log("Can't close port");
          }
        } catch (e) {
          console.log(e);
        }
      } else {
        console.log("trying to open port");
        try {
          port = new SerialPort({ path: comport, baudRate: baudRate }, (e) => {
            if (e) {
              console.log(e);
            } else {
              console.log("Port opened");
              port.pipe(parser);
            }
          });
          if (!port.isOpen) {
            console.log("Can't open port");
            port = null;
          }
        } catch (e) {
          console.log(e);
        }
      }

      break;

    default:
      if (
        (charAsAscii >= 0x30 && charAsAscii <= 0x39) ||
        charAsAscii === 0x20 ||
        (charAsAscii >= 0x61 && charAsAscii <= 0x7a) ||
        (charAsAscii >= 0x41 && charAsAscii <= 0x5a) ||
        charAsAscii === 0x2b ||
        charAsAscii === 0x2d ||
        charAsAscii === 0x2f ||
        charAsAscii === 0x3a ||
        charAsAscii === 0x24 ||
        charAsAscii === 0x21 ||
        charAsAscii === 0x3f ||
        charAsAscii === 0x3b ||
        charAsAscii === 0x2e ||
        charAsAscii === 0x3a ||
        charAsAscii === 0x5c ||
        charAsAscii === 0x40 ||
        charAsAscii === 0x29 ||
        charAsAscii === 0x28 ||
        charAsAscii === 0x5b ||
        charAsAscii === 0x5d ||
        charAsAscii === 0x7b ||
        charAsAscii === 0x7d ||
        charAsAscii === 0x22 ||
        charAsAscii === 0x23 ||
        charAsAscii === 0x7e ||
        charAsAscii === 0x26 ||
        charAsAscii === 0x7c ||
        charAsAscii === 0x5e ||
        charAsAscii === 0x25 ||
        charAsAscii === 0x24 ||
        charAsAscii === 0x2a ||
        charAsAscii === 0x3c ||
        charAsAscii === 0x3e ||
        charAsAscii === 0x3d ||
        charAsAscii === 0x2c
      ) {
        // 2B 2D 2F 3A 24 21 3F 3B 2E 3A 5C 40 29 28 5B 7B 7D 22 23 7E 26 7C 5E 25 24 2A 3C 3E
        if (process.stdin.currentLine.length >= cursorPosition) {
          cursorPosition++;
        } else {
          cursorPosition = process.stdin.currentLine.length;
        }
        filter = process.stdin.currentLine;
        process.stdin.currentLine += String.fromCharCode(charAsAscii);
        filter = process.stdin.currentLine;
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write("- " + process.stdin.currentLine);
      } else {
        cursorPosition = process.stdin.currentLine.length;
      }

      break;
  }
});

process.stdin.on("line", (data) => {
  if (data.toString().trim()[0] === "/") {
    switch (data.toString().trim().split(" ")[0]) {
      case "/hclr":
      case "/historyclear":
        fs.writeFileSync("./history", "");
        break;
      case "/clr":
      case "/clear":
        console.log(Array(process.stdout.rows + 1).join("\n"));
        break;
      case "/flush":
        port.flush();
        break;
      case "/pause":
        port.pause();
        break;
      case "/resume":
        port.resume();
        break;

      case "/list":
        SerialPort.list().then((ports) => {
          console.log("Available ports:");
          ports.forEach((port) => console.log(port.path));
        });
        break;
      // useless:
      case "/lastsend":
        // console.log("Last commands:");
        console.log(fs.readFileSync("./history").toString().split("\n"));
        break;
      case "/path":
        if (data.toString().trim().split(" ")[1]) port.update({ path: data.toString().trim().split(" ")[1] });
        else console.log("Current comport: ", comport);
        break;
      case "/bd":
      case "/baudrate":
        if (data.toString().trim().split(" ")[1]) port.update({ baudRate: parseInt(data.toString().trim().split(" ")[1]) });
        else console.log("Current baudrate: ", port.baudRate);
        break;
      case "/st":
      case "/status":
        console.log(`Port status: \x1b[33m${port.isOpen ? "open" : "close"}\x1b[00m - Data rate: \x1b[33m${port.baudRate}\x1b[00mbps - Path: \x1b[33m${comport}\x1b[0m`);
        break;
      case "/o":
      case "/option":
        if (data.toString().trim().split(" ")[1]) {
          const value = data.toString().trim().split(" ")[2];
          switch (data.toString().trim().split(" ")[1]) {
            case "brk":
              if (value === "on" || value === "off") options.brk = value === "on" ? true : false;
              else console.log("Unknown value. Use 'on' or 'off' to set the brk flag");
              break;
            case "cts":
              if (value === "on" || value === "off") options.cts = value === "on" ? true : false;
              else console.log("Unknown value. Use 'on' or 'off' to set the cts flag");
              break;
            case "dsr":
              if (value === "on" || value === "off") options.dsr = value === "on" ? true : false;
              else console.log("Unknown value. Use 'on' or 'off' to set the dsr flag");
              break;
            case "dtr":
              if (value === "on" || value === "off") options.dtr = value === "on" ? true : false;
              else console.log("Unknown value. Use 'on' or 'off' to set the dtr flag");
              break;
            case "rts":
              if (value === "on" || value === "off") options.rts = value === "on" ? true : false;
              else console.log("Unknown value. Use 'on' or 'off' to set the rts flag");
              break;
            case "lowLatency":
              if (value === "on" || value === "off") options.lowLatency = value === "on" ? true : false;
              else console.log("Unknown value. Use 'on' or 'off' to set the lowLatency flag");
              break;
            case "endchar":
              if (value === "" || value === undefined) console.log(`end char : ${options.endchar === "\r\n" ? "crlf" : options.endchar === "\r" ? "cr" : "lf"}`);
              else {
                if (value === "cr" || value === "lf" || value === "crlf") options.endchar = value === "cr" ? "\r" : value === "lf" ? "\n" : "\r\n";
                else console.log("Unknown value. Use 'cr', 'lf' or 'crlf' to set the endchar");
              }
              break;
            default:
              console.log("Unknown option");
              console.log(`example command : /option rts off`);
              console.log(`enchar example command : /option endchar crlf`);
              console.log(`brk, cts, dsr, dtr, rts, lowLatency, endchar`);
              break;
          }
          port.set(options, (e) => {
            if (e) console.log(e);
          });
        } else {
          console.log("Unknown option");
          console.log(`example command : /option rts off`);
          console.log(`enchar example command : /option endchar crlf`);
          console.log(`brk, cts, dsr, dtr, rts, lowLatency, endchar`);
        }
        break;
      case "/m":
      case "/mode":
        const m = data.toString().trim().split(" ")[1].toUpperCase();
        const AvailableModes = ["ASCII", "HEX", "DEC", "BIN"];
        if (!data.toString().trim().split(" ")[1] || !AvailableModes.includes(m)) {
          console.log("Available modes: ", AvailableModes);
          console.log("Current mode: ", mode);
          return;
        }
        mode = m;
        console.log("Mode set to: ", mode);
        break;
      case "/h":
      case "/help":
        console.log("Available commands:");
        console.log("/clear (/clr) - clear screen");
        console.log("/pause - pause port");
        console.log("/resume - resume port");
        console.log("/list - list available port");
        console.log("/path - show or set comport");
        console.log("/baudrate - show or set baudrate");
        console.log("/status  - show port status");
        console.log("/option (/o) - show setOptions");
        console.log("/mode - show or set mode");
        console.log("/historyclear (/hclr) - clear history");
        console.log("/help - show this help");
        break;
      default:
        console.log("Unknown command");
        console.log("/help - show this help");
        break;
    }
    cursorPosition = 0;
    return;
  }

  //#TODO: do send data in the selected mode
  // if (mode === "HEX") {
  // data = Buffer.from(data.toString().trim()).toString("hex");
  // }
  // if (mode === "DEC") {
  // data = Buffer.from(data.toString().trim()).toString("dec");
  // }
  // if (mode === "BIN") {
  // data = Buffer.from(data.toString().trim()).toString("bin");
  // }

  const d = data.toString().trim().replace(/\x1B/g, "");
  port.write(d + options.endchar);
  if (timeOptions.afterCommand) setLastTime();
  console.log(
    (timeOptions.actualTime ? getActuelTime() + " " : "") + (timeOptions.elapsed ? getTimeElapsedBetweenEachLine() + " " : "") + (timeOptions.afterCommand ? getActuelTime() + " " : "") + ">",
    color.green,
    d,
    color.reset
  );
  if (d.length > 0) {
    if (
      fs
        .readFileSync("./history")
        .toString()
        .split("\n")
        .filter((cmd) => cmd === d).length === 0
    )
      fs.appendFileSync("./history", d + "\n");
    else {
      const history = fs
        .readFileSync("./history")
        .toString()
        .split("\n")
        .filter((cmd) => cmd.length > 0);
      history.splice(history.indexOf(d), 1);
      history.push(d);
      history.push("");
      fs.writeFileSync("./history", history.join("\n"));
    }
  }
  cursorPosition = 0;
  filter = "";
  last = defaultlast;
});
