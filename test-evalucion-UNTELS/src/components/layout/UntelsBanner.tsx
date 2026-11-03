import Image from 'next/image';

/** Franja azul institucional con el logo UNTELS (letras blancas): mismo color en ambos temas. */
export default function UntelsBanner() {
  return (
    <div className="w-full bg-[#00357f] px-4 py-3 flex justify-center">
      <Image src="/Logo_UNTELS.png" alt="Universidad Nacional Tecnológica de Lima Sur" width={3170} height={720} priority className="h-10 sm:h-14 w-auto max-w-full" />
    </div>
  );
}
