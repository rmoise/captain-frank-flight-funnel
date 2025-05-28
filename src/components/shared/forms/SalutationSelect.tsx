"use client";

import React from "react";
import { Select, SelectOption } from "@/components/ui/input/Select";
import { useTranslation } from "@/hooks/useTranslation";

interface SalutationSelectProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: (value: string) => void;
  error?: string;
}

export const SalutationSelect: React.FC<SalutationSelectProps> = ({
  value,
  onChange,
  onBlur,
  error,
}) => {
  const { t } = useTranslation();

  const SALUTATION_OPTIONS: SelectOption[] = [
    {
      value: "herr",
      label: t("salutation.mr"),
      description: t("salutation.mr"),
    },
    {
      value: "frau",
      label: t("salutation.mrs"),
      description: t("salutation.mrs"),
    },
  ];

  return (
    <Select
      label={t("salutation.label")}
      value={value}
      onChange={onChange}
      options={SALUTATION_OPTIONS}
      error={error}
      required
    />
  );
};
