import db from "../models/index.js";
// import S3 from "aws-sdk/clients/s3.js";
import JWT from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
// import twilio from 'twilio';
import moment from "moment-timezone";
import axios from "axios";
import chalk from "chalk";
import nodemailer from "nodemailer";
console.log(import.meta.url);

import UserProfileFullResource from "../resources/userProfileFullResource.js";

export const GetDashboardData = async (req, res) => {
  let duration = parseInt(req.query.duration || 7); // Parse duration as an integer

  if (isNaN(duration) || duration <= 0) {
    return res.status(400).send({
      status: false,
      message: "Invalid duration. Please provide a valid number of days.",
    });
  }

  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (error) {
      return res.status(401).send({
        status: false,
        message: "Unauthorized access. Invalid token.",
      });
    }

    if (authData) {
      let userId = authData.user.id;

      // Fetch user and agents
      let user = await db.User.findOne({ where: { id: userId } });
      let agents = await db.MainAgentModel.findAll({ where: { userId } });
      let agentIds = agents.map((agent) => agent.id);

      // Calculate date ranges
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - duration);

      const priorStartDate = new Date(startDate);
      priorStartDate.setDate(startDate.getDate() - duration);

      const priorEndDate = new Date(startDate);

      // Fetch data for current and prior durations
      const callsInCurrentPeriod = await db.LeadCallsSent.findAll({
        where: {
          mainAgentId: { [db.Sequelize.Op.in]: agentIds },
          createdAt: { [db.Sequelize.Op.between]: [startDate, today] },
        },
      });

      const callsInPriorPeriod = await db.LeadCallsSent.findAll({
        where: {
          mainAgentId: { [db.Sequelize.Op.in]: agentIds },
          createdAt: {
            [db.Sequelize.Op.between]: [priorStartDate, priorEndDate],
          },
        },
      });

      // Initialize stats
      let stats = {
        totalDuration: 0,
        totalCalls: 0,
        totalCallsGt10: 0,
        notInterested: 0,
        hotLeads: 0,
        voicemail: 0,
        meetingScheduled: 0,
      };

      // Calculate stats for current period
      for (const call of callsInCurrentPeriod) {
        stats.totalDuration += call.duration || 0;
        stats.totalCalls += 1;
        if (call.duration > 10) stats.totalCallsGt10 += 1;
        if (call.notinterested) stats.notInterested += 1;
        if (call.hotlead) stats.hotLeads += 1;
        if (call.voicemail) stats.voicemail += 1;
        if (call.meetingscheduled) stats.meetingScheduled += 1;
      }

      // Initialize stats for prior period
      let priorStats = {
        totalDuration: 0,
        totalCalls: 0,
        totalCallsGt10: 0,
        hotLeads: 0,
        meetingScheduled: 0,
      };

      // Calculate stats for prior period
      for (const call of callsInPriorPeriod) {
        priorStats.totalDuration += call.duration || 0;
        priorStats.totalCalls += 1;
        if (call.duration > 10) priorStats.totalCallsGt10 += 1;
        if (call.hotlead) priorStats.hotLeads += 1;
        if (call.meetingscheduled) priorStats.meetingScheduled += 1;
      }

      // Calculate percentage changes
      const calculatePercentageChange = (current, prior) =>
        prior === 0
          ? current > 0
            ? 100
            : 0
          : ((current - prior) / prior) * 100;

      const statsComparison = {
        durationChange: calculatePercentageChange(
          stats.totalDuration,
          priorStats.totalDuration
        ),
        callsChange: calculatePercentageChange(
          stats.totalCalls,
          priorStats.totalCalls
        ),
        callsGt10Change: calculatePercentageChange(
          stats.totalCallsGt10,
          priorStats.totalCallsGt10
        ),
        hotLeadsChange: calculatePercentageChange(
          stats.hotLeads,
          priorStats.hotLeads
        ),
        bookingChange: calculatePercentageChange(
          stats.meetingScheduled,
          priorStats.meetingScheduled
        ),
      };

      // Format durations
      const formatDuration = (seconds) => {
        if (seconds < 60) return "Less than a min";
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        return `${min} min ${sec} sec`;
      };

      let avDuration = 0;
      if (callsInCurrentPeriod && callsInCurrentPeriod.length > 0) {
        avDuration = stats.totalDuration / callsInCurrentPeriod.length;
      }
      let formattedAvDuration = formatDuration(avDuration);

      return res.send({
        status: true,
        data: {
          stats: {
            totalDuration: formatDuration(stats.totalDuration),
            avDuration: formattedAvDuration,
            totalCalls: stats.totalCalls,
            totalCallsGt10: stats.totalCallsGt10,
            notInterested: stats.notInterested,
            meetingScheduled: stats.meetingScheduled,
            voicemail: stats.voicemail,
            hotLeads: stats.hotLeads,
          },
          statsComparison,
        },
      });
    }
  });
};
