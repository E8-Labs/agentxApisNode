const KnowledgeBase = (sequelize, Sequelize) => {
  const User = sequelize.define("KnowledgeBase", {
    type: {
      type: Sequelize.STRING, //document, text, url
      defaultValue: "",
    },
    originalContent: {
      // url, text, or document text
      type: Sequelize.TEXT("medium"),
      // defaultValue: "",
      allowNull: true,
    },

    title: {
      // name of the document
      type: Sequelize.STRING,
      // defaultValue: "",
      allowNull: true,
    },
    subject: {
      // subject of the url
      type: Sequelize.STRING,
      // defaultValue: "",
      allowNull: true,
    },
    processedData: {
      type: Sequelize.TEXT("medium"),
      allowNull: true,
      // defaultValue: "",
    },
    documentUrl: {
      //if document then the url of the document
      type: Sequelize.STRING,
      defaultValue: "",
    },
    documentUrl: {
      //if document then the url of the document
      type: Sequelize.STRING,
      defaultValue: "",
    },
    webUrl: {
      //if document then the url of the document
      type: Sequelize.STRING,
      defaultValue: "",
    },
    description: {
      type: Sequelize.TEXT("medium"),
      allowNull: true,
    },
    userId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "Users", // Table name (plural form)
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    processed: {
      //for cron job to check if it is processed or not
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    addedToDb: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    agentId: {
      type: Sequelize.INTEGER,
      defaultValue: null,
      references: {
        model: "AgentModels", // Table name (plural form)
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    mainAgentId: {
      type: Sequelize.INTEGER,
      defaultValue: null,
      references: {
        model: "MainAgentModels", // Table name (plural form)
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
  });

  return User;
};

export const KbTypes = {
  Text: "Text",
  Document: "Document",
  Url: "Url",
  Youtube: "Youtube",
};

export default KnowledgeBase;
