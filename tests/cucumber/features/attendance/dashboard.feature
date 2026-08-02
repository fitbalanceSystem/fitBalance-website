@attendance @sanity @regression
Feature: Attendance - Dashboard
  As an instructor or admin
  I want to record student attendance
  So that participation is tracked accurately

  Background:
    Given I am on the attendance dashboard

  @sanity
  Scenario: Attendance dashboard loads with submit button
    Then the attendance submit button is visible

  @sanity
  Scenario: Lesson name is displayed in header
    Then the lesson name header is displayed

  @regression
  Scenario: Change lesson modal opens
    When I click the change lesson button
    Then the change lesson modal is open

  @regression
  Scenario: Attendance count widget is visible
    Then the attendance count widget is visible
