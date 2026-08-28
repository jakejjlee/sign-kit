/** CSS modules are resolved by the consuming bundler, not by tsc. */
declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}
