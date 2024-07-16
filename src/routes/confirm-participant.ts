import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../lib/prisma";

export async function confirmParticipants(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    "/participants/:participantId/confirm",
    {
      schema: {
        params: z.object({
          participantId: z.string().uuid(),
        }),
        querystring: z.object({
          tripId: z.string().uuid().optional(), // tornando tripId opcional
        }),
      },
    },
    async (request, reply) => {
      const { participantId } = request.params;
      const { tripId } = request.query;

      const participant = await prisma.participant.findUnique({
        where: {
          id: participantId,
        },
        include: {
          trip: true, // garantindo que o relacionamento trip seja incluído
        },
      });

      if (!participant) {
        throw new Error("Participant not found");
      }

      if (!participant.is_confirmed) {
        await prisma.participant.update({
          where: { id: participantId },
          data: { is_confirmed: true },
        });
      }

      // Ajustando o redirecionamento para usar tripId se estiver disponível
      const redirectUrl = tripId
        ? `http://localhost:3000/trips/${tripId}`
        : `http://localhost:3000/trips`;

      return reply.redirect(redirectUrl);
    },
  );
}
