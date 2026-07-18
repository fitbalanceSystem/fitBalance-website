const host = window.location.hostname;

const envFile = host.startsWith("staging.")
    ? "env.staging.js"
    : "env.production.js";

const script = document.createElement("script");
script.src = `/config/${envFile}`;

script.onload = () => {
    const sbScript = document.createElement("script");
    sbScript.src = "../../services/supabaseClient.js";
    document.head.appendChild(sbScript);
};

document.head.appendChild(script);