import { z } from "zod";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { prisma } from "../lib/prisma";
import dayjs from "dayjs";
import nodemailer from "nodemailer";
import { getMailClient } from "../lib/mail";

export async function createTrip(app: FastifyInstance) {
  //
  app.withTypeProvider<ZodTypeProvider>().post(
    "/trips",
    {
      schema: {
        body: z.object({
          destination: z.string().min(4),
          starts_at: z.coerce.date(),
          ends_at: z.coerce.date(),
          owner_name: z.string(),
          owner_email: z.string().email(),
          emails_to_invite: z.array(z.string().email()),
        }),
      },
    },
    async (request) => {
      const { destination, ends_at, starts_at, owner_email, owner_name, emails_to_invite } =
        request.body;

      if (dayjs(starts_at).isBefore(new Date())) {
        throw new Error("Invalid trips start date");
      }

      if (dayjs(ends_at).isBefore(starts_at)) {
        throw new Error("Invalid trips end date");
      }
      const trip = await prisma.trip.create({
        data: {
          destination,
          ends_at,
          starts_at,
        },
      });

      const mail = await getMailClient();

      const message = await mail.sendMail({
        from: {
          name: "Equiper plann.er",
          address: "suport@plann.er",
        },
        to: {
          name: owner_name,
          address: owner_email,
        },
        subject: "Teste de envio",
        html: `
          <p> teste </p>
        `,
      });
      console.log(nodemailer.getTestMessageUrl(message));

      return {
        tripId: trip.id,
      };
    },
  );
}
