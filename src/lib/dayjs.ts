import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import "dayjs/locale/pt-br";
dayjs.locale("pt-br");
dayjs.extend(localizedFormat);

import nodemailer from "nodemailer";

export { dayjs };
