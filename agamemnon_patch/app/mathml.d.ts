import type { ReactNode } from "react";

type MathMLIntrinsicProps = {
  children?: ReactNode;
  [attribute: string]: unknown;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      math: MathMLIntrinsicProps;
      mrow: MathMLIntrinsicProps;
      mi: MathMLIntrinsicProps;
      mn: MathMLIntrinsicProps;
      mo: MathMLIntrinsicProps;
      mtext: MathMLIntrinsicProps;
      mspace: MathMLIntrinsicProps;
      mfrac: MathMLIntrinsicProps;
      msqrt: MathMLIntrinsicProps;
      msub: MathMLIntrinsicProps;
      msup: MathMLIntrinsicProps;
      msubsup: MathMLIntrinsicProps;
      mover: MathMLIntrinsicProps;
    }
  }
}

export {};
