import { getAssetPath } from "../utils/assetPath";

const Button = ({ text, className, id }) => {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();

        if (!id) return;
        const target = document.getElementById(id);
        if (!target) return;

        const offset = window.innerHeight * 0.15;
        const top =
          target.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top, behavior: "smooth" });
      }}
      className={`${className ?? ""} cta-wrapper`}
    >
      <div className="cta-button group">
        <div className="bg-circle" />
        <p className="text">{text}</p>
        <div className="arrow-wrapper">
          <img src={getAssetPath("/images/arrow-down.svg")} alt="" />
        </div>
      </div>
    </button>
  );
};

export default Button;
