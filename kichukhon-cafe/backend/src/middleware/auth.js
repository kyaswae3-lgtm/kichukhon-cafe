import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';
export async function auth(req,res,next) {
 try {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i,'');
  if (!token) return res.status(401).json({message:'Authentication required'});
  const payload = jwt.verify(token,process.env.JWT_SECRET);
  const { rows } = await pool.query('SELECT id,name,email,role,is_active FROM users WHERE id=$1',[payload.sub]);
  if (!rows[0] || !rows[0].is_active) return res.status(401).json({message:'Account unavailable'});
  req.user=rows[0]; next();
 } catch { return res.status(401).json({message:'Invalid or expired token'}); }
}
export const adminOnly=(req,res,next)=>req.user?.role==='admin'?next():res.status(403).json({message:'Admin access required'});
