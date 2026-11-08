import type { FastifyInstance, FastifyRequest } from 'fastify'; import type { Role, User } from '@pulseops/contracts';
declare module '@fastify/jwt' { interface FastifyJWT { payload: User; user: User } }
export async function requireAuth(request:FastifyRequest){await request.jwtVerify();}
const rank:Record<Role,number>={viewer:1,operator:2,admin:3};
export const requireRole=(minimum:Role)=>async(request:FastifyRequest)=>{await request.jwtVerify(); if(rank[request.user.role]<rank[minimum]){const error=new Error('Insufficient permissions') as Error&{statusCode:number};error.statusCode=403;throw error;}};
export function signSession(app:FastifyInstance,user:User){return app.jwt.sign(user,{expiresIn:'8h'});}
