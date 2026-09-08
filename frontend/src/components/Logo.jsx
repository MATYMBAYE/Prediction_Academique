import logo from "../assets/logo-isi-suptech.png";

export default function Logo({ size = 32, className = "" }) {
  return (
    <img
      src={logo}
      alt="ISI SUPTECH — Institut Superieur de Technologies"
      style={{ height: size }}
      className={`w-auto object-contain ${className}`}
    />
  );
}
