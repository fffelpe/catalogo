export function ehErroPermissaoGoogle(erro) {
  const status = Number(
    erro?.response?.status ??
    erro?.status ??
    erro?.code
  );
  return status === 403;
}
