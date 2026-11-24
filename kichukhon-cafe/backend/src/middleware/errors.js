export function notFound(req,res){res.status(404).json({message:'Route not found'});}
export function errorHandler(err,req,res,next){
 console.error(err);
 if (err.name==='ZodError') return res.status(400).json({message:'Validation failed',errors:err.errors});
 if (err.code==='23505') return res.status(409).json({message:'A record with this value already exists'});
 res.status(err.status||500).json({message:process.env.NODE_ENV==='production'?'Server error':err.message||'Server error'});
}
