import clsx from "clsx";

type VisaBrandMarkProps = {
  alt?: string;
  className?: string;
  imageClassName?: string;
};

type VisaCreditProps = {
  className?: string;
  size?: "sm" | "md";
};

const creditSize = {
  sm: {
    mark: "h-7 w-7",
    wrapper: "gap-2 px-3 py-2",
    title: "text-[11px]",
    subtitle: "text-[10px]",
  },
  md: {
    mark: "h-9 w-9",
    wrapper: "gap-2.5 px-3.5 py-2.5",
    title: "text-xs",
    subtitle: "text-[11px]",
  },
};

export function VisaBrandMark({
  alt = "Visa Assistant",
  className,
  imageClassName,
}: VisaBrandMarkProps) {
  return (
    <span
      aria-label={alt}
      role="img"
      className={clsx("relative inline-flex shrink-0 overflow-hidden", className)}
    >
      <img
        aria-hidden="true"
        alt=""
        className={clsx("block h-full w-full object-contain dark:hidden", imageClassName)}
        src="/visa-dark-mark.png"
      />
      <img
        aria-hidden="true"
        alt=""
        className={clsx("hidden h-full w-full object-contain dark:block", imageClassName)}
        src="/visa-light-mark.png"
      />
    </span>
  );
}

export function VisaCredit({ className, size = "sm" }: VisaCreditProps) {
  const styles = creditSize[size];

  return (
    <div
      className={clsx(
        "inline-flex items-center rounded-lg border border-default-200 bg-background/75 text-left shadow-sm backdrop-blur-md",
        styles.wrapper,
        className,
      )}
    >
      <VisaBrandMark className={styles.mark} />
      <div className="leading-tight">
        <p className={clsx("font-semibold text-foreground", styles.title)}>
          Powered by Visa Assistant
        </p>
        <p className={clsx("font-medium text-default-500", styles.subtitle)}>
          Develop by Rafi Hadiyasa
        </p>
      </div>
    </div>
  );
}
