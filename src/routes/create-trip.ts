import { z } from "zod";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { prisma } from "../lib/prisma";
import localizedFormat from "dayjs/plugin/localizedFormat";

import "dayjs/locale/pt-br";
import nodemailer from "nodemailer";
import { getMailClient } from "../lib/mail";
import { dayjs } from "../lib/dayjs";
dayjs.locale("pt-br");
dayjs.extend(localizedFormat);

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
          starts_at,
          ends_at,
          participants: {
            createMany: {
              data: [
                {
                  name: owner_name,
                  email: owner_email,
                  is_owner: true,
                  is_confirmed: true,
                },

                ...emails_to_invite.map((email) => {
                  return { email };
                }),
              ],
            },
          },
        },
      });

      const formattedStartDate = dayjs(starts_at).format("LL");
      const formattedEndDate = dayjs(ends_at).format("LL");

      const confirmationLink = `http://localhost:3333/trips/${trip.id}/confirm`;

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
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="text-align: center; color: #333;">Confirmação de Viagem</h2>
          <p>Olá <strong>${owner_name}</strong>,</p>
          <p>Sua viagem para <strong>${destination}</strong> está confirmada!</p>
          <p><strong>Início:</strong> ${formattedStartDate}</p>
          <p><strong>Fim:</strong> ${formattedEndDate}</p>
          <p>Para confirmar sua participação, por favor clique no link abaixo:</p>
          <p style="text-align: center;">
            <a href="${confirmationLink}" style="display: inline-block; padding: 10px 20px; color: #fff; background-color: #28a745; border-radius: 5px; text-decoration: none;">Confirmar Participação</a>
          </p>
          <p>Estamos ansiosos para vê-lo em breve!</p>
          <p>Atenciosamente,<br/>Equipe plann.er</p>
        </div>
      `,
      });
      console.log(nodemailer.getTestMessageUrl(message));

      return {
        tripId: trip.id,
      };
    },
  );
}
