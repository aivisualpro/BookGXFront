export function ParticleBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 opacity-30">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
    </div>
  );
}