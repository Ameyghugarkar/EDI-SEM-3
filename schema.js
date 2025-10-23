const Joi = require("joi");

module.exports.violationSchema = Joi.object({
  Violation: Joi.object({
    employee: Joi.string().trim().required(),

    category: Joi.string()
      .trim()
      .valid("safety", "ppe", "procedure", "security")
      .required(),

    location: Joi.string()
      .trim()
      .valid(
        "warehouse-a",
        "warehouse-b",
        "production-line-1",
        "production-line-2",
        "loading-dock",
        "office-area"
      )
      .required(),

    description: Joi.string().trim().required(),

    correctiveAction: Joi.string().trim().allow("", null),

    evidence: Joi.object({
      filename: Joi.string().default("no-file"),
      url: Joi.string()
        .uri()
        .allow("")
        .default("https://via.placeholder.com/300x200?text=No+Evidence"),
      fileType: Joi.string()
        .valid("image", "video", "unknown")
        .default("unknown"),
    }).default({}),

    createdAt: Joi.date().default(() => new Date()),   // <-- fixed
  }).required(),
});
